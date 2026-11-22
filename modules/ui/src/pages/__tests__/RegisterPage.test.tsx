import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../RegisterPage';
import i18n from '../../i18n';

vi.mock('../../app/container', () => ({
  env: { authBaseUrl: 'https://auth.example.test' },
  registerUseCase: { execute: vi.fn() },
}));

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage email prefill', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('prefills the email field from a valid ?email= query parameter and keeps it editable', () => {
    renderAt('/register?email=a%40b.rs');
    const email = screen.getByRole<HTMLInputElement>('textbox', { name: 'Email' });
    expect(email.value).toBe('a@b.rs');
    expect(email.readOnly).toBe(false);

    email.value = 'changed@b.rs';
    expect(email.value).toBe('changed@b.rs');
  });

  it('leaves the email field empty when the query parameter is missing', () => {
    renderAt('/register');
    const email = screen.getByRole<HTMLInputElement>('textbox', { name: 'Email' });
    expect(email.value).toBe('');
  });

  it('leaves the email field empty when the query parameter is not a valid email', () => {
    renderAt('/register?email=not-an-email');
    const email = screen.getByRole<HTMLInputElement>('textbox', { name: 'Email' });
    expect(email.value).toBe('');
  });
});
