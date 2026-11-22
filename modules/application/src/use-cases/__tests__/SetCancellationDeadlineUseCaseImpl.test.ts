import { describe, it, expect, vi } from 'vitest';
import { SetCancellationDeadlineUseCaseImpl } from '../business/SetCancellationDeadlineUseCaseImpl';
import {
  MAX_CANCELLATION_NOTICE_MINUTES,
  MIN_CANCELLATION_NOTICE_MINUTES,
  NotFoundError,
  ValidationError,
} from '@fe/domain';
import type { Business, BusinessRepository } from '@fe/domain';

const businessId = 'a1b2c3d4-0000-0000-0000-000000000001';

const business: Business = {
  id: businessId,
  name: 'Salon One',
  status: 'ACTIVE',
  ownerId: 'b0b00000-0000-0000-0000-000000000009',
  categoryId: null,
  category: null,
  imageUrl: null,
  allowOverlappingPendingReservations: true,
  minNoticeMinutes: 120,
};

const repoWith = (setCancellationDeadline: BusinessRepository['setCancellationDeadline']) =>
  ({ setCancellationDeadline }) as unknown as BusinessRepository;

describe('SetCancellationDeadlineUseCaseImpl', () => {
  it('sends minNoticeMinutes to the repository and returns the updated business', async () => {
    const setCancellationDeadline = vi.fn().mockResolvedValue(business);
    const useCase = new SetCancellationDeadlineUseCaseImpl(repoWith(setCancellationDeadline));

    const result = await useCase.execute(businessId, 120);

    expect(setCancellationDeadline).toHaveBeenCalledWith(businessId, { minNoticeMinutes: 120 });
    expect(result).toEqual(business);
  });

  it.each([MIN_CANCELLATION_NOTICE_MINUTES, MAX_CANCELLATION_NOTICE_MINUTES])(
    'accepts the boundary value %i',
    async (value) => {
      const setCancellationDeadline = vi.fn().mockResolvedValue(business);
      const useCase = new SetCancellationDeadlineUseCaseImpl(repoWith(setCancellationDeadline));

      await useCase.execute(businessId, value);

      expect(setCancellationDeadline).toHaveBeenCalledWith(businessId, { minNoticeMinutes: value });
    },
  );

  it.each([
    ['below the minimum', MIN_CANCELLATION_NOTICE_MINUTES - 1],
    ['above the maximum', MAX_CANCELLATION_NOTICE_MINUTES + 1],
    ['zero', 0],
    ['negative', -5],
    ['fractional', 1.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('rejects %s without calling the repository', async (_label, value) => {
    const setCancellationDeadline = vi.fn();
    const useCase = new SetCancellationDeadlineUseCaseImpl(repoWith(setCancellationDeadline));

    await expect(useCase.execute(businessId, value)).rejects.toBeInstanceOf(ValidationError);
    expect(setCancellationDeadline).not.toHaveBeenCalled();
  });

  it('propagates a repository failure', async () => {
    const failure = new NotFoundError('Business', businessId);
    const setCancellationDeadline = vi.fn().mockRejectedValue(failure);
    const useCase = new SetCancellationDeadlineUseCaseImpl(repoWith(setCancellationDeadline));

    await expect(useCase.execute(businessId, 60)).rejects.toBe(failure);
  });
});
