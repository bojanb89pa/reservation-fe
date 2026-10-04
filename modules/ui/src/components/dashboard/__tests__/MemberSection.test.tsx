import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemberSection } from '../MemberSection';
import '../../../i18n';

const mocks = vi.hoisted(() => ({
  refetchMembers: vi.fn(),
  addMember: vi.fn(),
  notifyMembership: vi.fn(),
}));

vi.mock('../../../hooks/useBusinessMembers', () => ({
  useBusinessMembers: () => ({ data: [], refetch: mocks.refetchMembers }),
  useAddBusinessMember: () => ({ mutateAsync: mocks.addMember, isPending: false, error: null }),
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

describe('MemberSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addMember.mockResolvedValue(undefined);
    mocks.notifyMembership.mockResolvedValue(undefined);
  });

  it('adds a manually typed email and notifies with businessId and email only', async () => {
    mocks.refetchMembers.mockResolvedValue({
      data: [{ id: 'm1', userId: null, email: 'new@example.com' }],
    });
    renderSection();

    fireEvent.change(screen.getByLabelText('Search user by name or email'), {
      target: { value: ' new@example.com ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '+ Add owner' }));

    await waitFor(() =>
      expect(mocks.notifyMembership).toHaveBeenCalledWith({
        businessId: 'b1',
        email: 'new@example.com',
      }),
    );
    expect(mocks.addMember).toHaveBeenCalledWith('new@example.com');
  });

  it('keeps the add button disabled while nothing is typed or selected', () => {
    renderSection();

    expect(screen.getByRole('button', { name: '+ Add owner' })).toBeDisabled();
  });
});
