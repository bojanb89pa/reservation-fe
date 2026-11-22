import { describe, it, expect, vi } from 'vitest';
import { RemoveCancellationDeadlineUseCaseImpl } from '../business/RemoveCancellationDeadlineUseCaseImpl';
import { NotFoundError } from '@fe/domain';
import type { Business, BusinessRepository } from '@fe/domain';

const businessId = 'a1b2c3d4-0000-0000-0000-000000000001';

const businessWithoutDeadline: Business = {
  id: businessId,
  name: 'Salon One',
  status: 'ACTIVE',
  ownerId: 'b0b00000-0000-0000-0000-000000000009',
  categoryId: null,
  category: null,
  imageUrl: null,
  allowOverlappingPendingReservations: true,
  minNoticeMinutes: null,
};

const repoWith = (removeCancellationDeadline: BusinessRepository['removeCancellationDeadline']) =>
  ({ removeCancellationDeadline }) as unknown as BusinessRepository;

describe('RemoveCancellationDeadlineUseCaseImpl', () => {
  it('removes the deadline and returns the updated business', async () => {
    const removeCancellationDeadline = vi.fn().mockResolvedValue(businessWithoutDeadline);
    const useCase = new RemoveCancellationDeadlineUseCaseImpl(repoWith(removeCancellationDeadline));

    const result = await useCase.execute(businessId);

    expect(removeCancellationDeadline).toHaveBeenCalledWith(businessId);
    expect(result.minNoticeMinutes).toBeNull();
  });

  it('propagates a repository failure', async () => {
    const failure = new NotFoundError('Business', businessId);
    const removeCancellationDeadline = vi.fn().mockRejectedValue(failure);
    const useCase = new RemoveCancellationDeadlineUseCaseImpl(repoWith(removeCancellationDeadline));

    await expect(useCase.execute(businessId)).rejects.toBe(failure);
  });
});
