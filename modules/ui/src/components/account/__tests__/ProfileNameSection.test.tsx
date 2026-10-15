import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User } from '@fe/domain';
import '../../../i18n';

const execute = vi.fn();
// A rejection is returned outside the spy: vitest's spy would otherwise report the rejected
// promise it records as unhandled.
let failWith: unknown = null;
vi.mock('../../../app/container', () => ({
  updateOwnProfileUseCase: {
    execute: (...args: unknown[]) => {
      const result = execute(...args);
      return failWith ? Promise.reject(failWith) : result;
    },
  },
}));

import { ProfileNameSection } from '../ProfileNameSection';

const user = {
  id: 'u1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  roles: [],
  enabled: true,
  status: 'ACTIVE',
  profilePictureUrl: null,
} as unknown as User;

function renderSection() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProfileNameSection user={user} />
    </QueryClientProvider>,
  );
}

describe('ProfileNameSection', () => {
  beforeEach(() => {
    execute.mockReset();
    failWith = null;
  });

  it('prefills the labelled fields with the current name', () => {
    renderSection();
    expect(screen.getByLabelText('First name')).toHaveValue('Jane');
    expect(screen.getByLabelText('Last name')).toHaveValue('Doe');
  });

  it('sends only firstName and lastName', async () => {
    execute.mockResolvedValue({ ...user, firstName: 'Janet' });
    renderSection();
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Janet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() =>
      expect(execute).toHaveBeenCalledWith({ firstName: 'Janet', lastName: 'Doe' }),
    );
    expect(await screen.findByText('Your name has been updated.')).toBeInTheDocument();
  });

  it('does not submit a whitespace-only name', () => {
    renderSection();
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Save name' })).toBeDisabled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('shows a translated message instead of the raw error', async () => {
    failWith = Object.assign(new Error('Request failed with status code 422'), { status: 422 });
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This name could not be accepted. Please try a different one.',
    );
    expect(screen.queryByText(/status code/)).not.toBeInTheDocument();
  });
});
