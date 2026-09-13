import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UserSummary } from '@domain';
import { UserAutocompleteInput } from '../UserAutocompleteInput';
import '../../../i18n';

const searchUsersUseCase = { execute: vi.fn() };

vi.mock('../../../app/container', () => ({
  searchUsersUseCase: {
    execute: (...args: unknown[]) => searchUsersUseCase.execute(...args),
  },
}));

const user: UserSummary = {
  id: 'u1',
  email: 'ana@example.com',
  firstName: 'Ana',
  lastName: 'Petrović',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UserAutocompleteInput', () => {
  it('shows suggestions returned by the search use case and reports the pick', async () => {
    searchUsersUseCase.execute.mockResolvedValue([user]);
    const onSelect = vi.fn();

    renderWithClient(
      <UserAutocompleteInput
        selectedUser={null}
        onSelect={onSelect}
        onClear={vi.fn()}
        placeholder="Search"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'ana' } });

    await waitFor(() => expect(screen.getByText('ana@example.com')).toBeInTheDocument(), {
      timeout: 1000,
    });
    fireEvent.click(screen.getByText('ana@example.com'));

    expect(onSelect).toHaveBeenCalledWith(user);
  });

  it('shows the selected user with a way to change the selection', () => {
    renderWithClient(
      <UserAutocompleteInput
        selectedUser={user}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        placeholder="Search"
      />,
    );

    expect(screen.getByText('Ana Petrović')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search')).not.toBeInTheDocument();
  });
});
