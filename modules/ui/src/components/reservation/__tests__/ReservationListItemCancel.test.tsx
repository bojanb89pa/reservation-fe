import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReservationCancellationErrorCode } from '@fe/domain';
import type { Reservation } from '@fe/domain';
import { ReservationListItem } from '../ReservationListItem';
import '../../../i18n';

const cancelExecute = vi.fn();

vi.mock('../../../app/container', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  tokenStorage: { getAccessToken: () => null },
  cancelReservationUseCase: { execute: (...a: unknown[]) => cancelExecute(...a) },
  approveReservationUseCase: { execute: vi.fn() },
  rejectReservationUseCase: { execute: vi.fn() },
}));

vi.mock('../../../hooks/useCurrentRoles', () => ({ useCurrentUserId: () => 'user-1' }));
vi.mock('../../../hooks/useBusinessMembers', () => ({ useIsBusinessMember: () => false }));
vi.mock('../ReservationOriginBadge', () => ({ ReservationOriginBadge: () => null }));
vi.mock('../../UserBadge', () => ({ UserBadge: () => null }));

const reservation = {
  id: 'res-1',
  userId: 'user-1',
  resourceId: 'resource-1',
  serviceId: 'service-1',
  status: 'CONFIRMED',
  startTime: '2030-01-01T10:00:00Z',
  endTime: '2030-01-01T11:00:00Z',
} as unknown as Reservation;

function renderItem() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReservationListItem reservation={reservation} />
    </QueryClientProvider>,
  );
}

describe('ReservationListItem cancellation', () => {
  beforeEach(() => {
    cancelExecute.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows a clear message when the cancellation deadline has passed', async () => {
    cancelExecute.mockRejectedValue(
      Object.assign(new Error('BE message'), {
        code: ReservationCancellationErrorCode.CANCELLATION_DEADLINE_PASSED,
      }),
    );
    renderItem();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reservation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'the cancellation deadline has passed',
    );
  });

  it('falls back to the error message for other errors', async () => {
    cancelExecute.mockRejectedValue(new Error('Something else'));
    renderItem();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reservation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something else');
  });
});
