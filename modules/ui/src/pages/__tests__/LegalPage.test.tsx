import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalPage } from '../LegalPage';
import i18n from '../../i18n';

vi.mock('../../app/container', () => ({ env: { legalContactEmail: 'legal@example.test' } }));

describe('LegalPage', () => {
  it('renders the privacy policy with the contact email from env', async () => {
    await i18n.changeLanguage('en');
    render(<LegalPage kind="privacy" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'legal@example.test' }).getAttribute('href')).toBe(
      'mailto:legal@example.test',
    );
    expect(screen.getByText(/Last updated/)).toBeTruthy();
  });

  it('renders the terms in Serbian', async () => {
    await i18n.changeLanguage('sr');
    render(<LegalPage kind="terms" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Uslovi korišćenja' })).toBeTruthy();
  });
});
