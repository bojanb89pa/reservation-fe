import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReservationSlotTakenError } from '@domain';
import type { Reservation } from '@domain';
import { PendingReservationCard } from '../PendingReservationCard';
import '../../../i18n';

const approveExecute = vi.fn();
const invalidateSlots = vi.fn();

vi.mock('../../../app/container', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  tokenStorage: { getAccessToken: () => null },
  approveReservationUseCase: { execute: (...args: unknown[]) => approveExecute(...args) },
  rejectReservationUseCase: { execute: vi.fn() },
}));

vi.mock('../../../hooks/useBusinessMembers', () => ({
  useIsBusinessMember: () => true,
}));

vi.mock('../../../hooks/useResourceSlots', () => ({
  useInvalidateResourceSlots: () => invalidateSlots,
}));

const reservation = {
  id: 'res-1',
  resourceId: 'resource-1',
  serviceId: 'svc-1',
  status: 'PENDING_APPROVAL',
  startTime: '2026-10-20T10:00:00',
  endTime: '2026-10-20T11:00:00',
  business: { id: 'biz-1', name: 'Barber House' },
} as unknown as Reservation;

describe('PendingReservationCard slot taken', () => {
  beforeEach(() => {
    approveExecute.mockReset();
    invalidateSlots.mockReset();
  });

  it('shows the error message with a hint and refreshes slots on RESERVATION_SLOT_TAKEN', async () => {
    approveExecute.mockRejectedValue(new ReservationSlotTakenError('Slot already taken'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PendingReservationCard reservation={reservation} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText(/Slot already taken/)).toHaveTextContent(
      'Please pick a different time slot.',
    );
    await waitFor(() => expect(invalidateSlots).toHaveBeenCalledWith('resource-1'));
  });
});
