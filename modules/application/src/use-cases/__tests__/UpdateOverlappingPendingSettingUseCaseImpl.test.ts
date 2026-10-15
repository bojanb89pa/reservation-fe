import { describe, it, expect, vi } from 'vitest';
import { UpdateOverlappingPendingSettingUseCaseImpl } from '../business/UpdateOverlappingPendingSettingUseCaseImpl';
import { NotFoundError } from '@fe/domain';
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
  allowOverlappingPendingReservations: false,
};

const repoWith = (
  updateOverlappingPendingSetting: BusinessRepository['updateOverlappingPendingSetting'],
): BusinessRepository => ({ updateOverlappingPendingSetting }) as unknown as BusinessRepository;

describe('UpdateOverlappingPendingSettingUseCaseImpl', () => {
  it('sends the flag to the repository and returns the updated business', async () => {
    const updateOverlappingPendingSetting = vi.fn().mockResolvedValue(business);
    const useCase = new UpdateOverlappingPendingSettingUseCaseImpl(
      repoWith(updateOverlappingPendingSetting),
    );

    const result = await useCase.execute(businessId, false);

    expect(updateOverlappingPendingSetting).toHaveBeenCalledWith(businessId, {
      allowOverlappingPendingReservations: false,
    });
    expect(result).toEqual(business);
  });

  it('propagates a repository failure', async () => {
    const failure = new NotFoundError('Business', businessId);
    const updateOverlappingPendingSetting = vi.fn().mockRejectedValue(failure);
    const useCase = new UpdateOverlappingPendingSettingUseCaseImpl(
      repoWith(updateOverlappingPendingSetting),
    );

    await expect(useCase.execute(businessId, true)).rejects.toBe(failure);
  });
});
