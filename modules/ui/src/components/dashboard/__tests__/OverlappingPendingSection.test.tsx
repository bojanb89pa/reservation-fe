import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BusinessErrorCode } from '@domain';
import type { Business } from '@domain';
import { OverlappingPendingSection } from '../OverlappingPendingSection';
import '../../../i18n';

const execute = vi.fn();
let currentUserId: string | null = 'owner-1';

vi.mock('../../../app/container', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  tokenStorage: { getAccessToken: () => null },
  updateOverlappingPendingSettingUseCase: {
    execute: (...args: unknown[]) => execute(...args),
  },
}));

vi.mock('../../../hooks/useCurrentRoles', () => ({
  useCurrentUserId: () => currentUserId,
}));

const business: Business = {
  id: 'biz-1',
  name: 'Barber House',
  status: 'ACTIVE',
  ownerId: 'owner-1',
  categoryId: null,
  category: null,
  imageUrl: null,
  allowOverlappingPendingReservations: true,
};

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OverlappingPendingSection business={business} />
    </QueryClientProvider>,
  );
}

describe('OverlappingPendingSection', () => {
  beforeEach(() => {
    execute.mockReset();
    currentUserId = 'owner-1';
  });

  it('shows the switch and the new-requests-only warning to the owner', () => {
    renderSection();
    const toggle = screen.getByRole('switch', {
      name: 'Allow overlapping pending reservations',
    });
    expect(toggle).toBeChecked();
    expect(screen.getByText(/applies only to new requests/i)).toBeInTheDocument();
  });

  it('hides the switch from a non-owner', () => {
    currentUserId = 'employee-1';
    renderSection();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('sends the new value when the owner flips the switch', async () => {
    execute.mockResolvedValue({ ...business, allowOverlappingPendingReservations: false });
    renderSection();
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(execute).toHaveBeenCalledWith('biz-1', false));
  });

  it('shows a localized message on OWNER_REQUIRED', async () => {
    execute.mockRejectedValue(
      Object.assign(new Error('x'), { code: BusinessErrorCode.OWNER_REQUIRED }),
    );
    renderSection();
    fireEvent.click(screen.getByRole('switch'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only the business owner can change this setting.',
    );
  });
});
