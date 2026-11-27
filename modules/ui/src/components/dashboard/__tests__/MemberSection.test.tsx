import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnauthorizedError } from '@fe/domain';
import { MemberSection } from '../MemberSection';
import '../../../i18n';

const mocks = vi.hoisted(() => ({
  addMember: vi.fn(),
  notifyMembership: vi.fn(),
  addError: null as Error | null,
}));

vi.mock('../../../hooks/useBusinessMembers', () => ({
  useBusinessMembers: () => ({ data: [] }),
  useAddBusinessMember: () => ({
    mutateAsync: mocks.addMember,
    isPending: false,
    error: mocks.addError,
  }),
  useRemoveBusinessMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useNotifyBusinessMembership: () => ({ mutateAsync: mocks.notifyMembership }),
}));

vi.mock('../../../hooks/useUsersByIds', () => ({
  useUsersByIds: () => ({ data: [] }),
  mapUsersById: () => new Map(),
}));

vi.mock('../../../hooks/useUserSearch', () => ({
  useUserSearch: () => ({ data: [], isFetching: false }),
}));

function renderSection() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemberSection businessId="b1" role="OWNER" title="Owners" />
    </QueryClientProvider>,
  );
}

function submitEmail(email: string) {
  fireEvent.change(screen.getByLabelText('Search user by name or email'), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole('button', { name: '+ Add owner' }));
}

describe('MemberSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addError = null;
    mocks.addMember.mockResolvedValue(undefined);
    mocks.notifyMembership.mockResolvedValue(undefined);
  });

  it('adds a manually typed email, shows the invitation notice and notifies with businessId and email only', async () => {
    renderSection();

    submitEmail(' new@example.com ');

    expect(await screen.findByText('Invitation sent to new@example.com')).toBeInTheDocument();
    expect(mocks.addMember).toHaveBeenCalledWith('new@example.com');
    expect(mocks.notifyMembership).toHaveBeenCalledWith({
      businessId: 'b1',
      email: 'new@example.com',
    });
  });

  it('shows the localized no-permission message for a 403 instead of the invitation notice', () => {
    mocks.addError = new UnauthorizedError();
    renderSection();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('You do not have permission to add members to this business.');
    expect(screen.queryByText(/Invitation sent to/)).not.toBeInTheDocument();
  });

  it('does not show the invitation notice or notify when the add is rejected with 403', async () => {
    mocks.addMember.mockRejectedValueOnce(new UnauthorizedError());
    renderSection();

    submitEmail('new@example.com');

    await waitFor(() => expect(mocks.addMember).toHaveBeenCalledWith('new@example.com'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.notifyMembership).not.toHaveBeenCalled();
    expect(screen.queryByText(/Invitation sent to/)).not.toBeInTheDocument();
  });

  it('shows the backend message for other add errors such as a conflict', () => {
    mocks.addError = new Error('Member already exists');
    renderSection();

    expect(screen.getByRole('alert')).toHaveTextContent('Member already exists');
    expect(screen.queryByText(/You do not have permission/)).not.toBeInTheDocument();
  });

  it('keeps the add button disabled while nothing is typed or selected', () => {
    renderSection();

    expect(screen.getByRole('button', { name: '+ Add owner' })).toBeDisabled();
  });
});
