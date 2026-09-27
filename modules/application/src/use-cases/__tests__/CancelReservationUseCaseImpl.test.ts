import { describe, it, expect, vi } from 'vitest';
import { CancelReservationUseCaseImpl } from '../reservation/CancelReservationUseCaseImpl';
import type { Reservation, ReservationRepository } from '@domain';

const resourceId = 'resource-001';
const reservationId = 'reservation-001';

const cancelledReservation: Reservation = {
  id: reservationId,
  resourceId,
  userId: 'user-001',
  serviceId: 'service-001',
  startTime: '2026-10-01T09:00:00Z',
  endTime: '2026-10-01T10:00:00Z',
  status: 'CANCELLED',
  service: null,
  resource: null,
  business: null,
};

const repoWith = (cancel: ReservationRepository['cancel']): ReservationRepository =>
  ({ cancel }) as unknown as ReservationRepository;

describe('CancelReservationUseCaseImpl', () => {
  it('cancels the reservation and returns the updated result', async () => {
    const cancel = vi.fn().mockResolvedValue(cancelledReservation);
    const useCase = new CancelReservationUseCaseImpl(repoWith(cancel));

    const result = await useCase.execute(resourceId, reservationId);

    expect(cancel).toHaveBeenCalledWith(resourceId, reservationId);
    expect(result.status).toBe('CANCELLED');
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('Reservation not found');
    const cancel = vi.fn().mockRejectedValue(failure);
    const useCase = new CancelReservationUseCaseImpl(repoWith(cancel));

    await expect(useCase.execute(resourceId, reservationId)).rejects.toBe(failure);
  });
});
