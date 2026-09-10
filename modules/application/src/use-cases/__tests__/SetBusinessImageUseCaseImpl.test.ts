import { describe, it, expect, vi } from 'vitest';
import { SetBusinessImageUseCaseImpl } from '../business/SetBusinessImageUseCaseImpl';
import { NotFoundError } from '@domain';
import type { Business, BusinessRepository } from '@domain';

const businessId = 'a1b2c3d4-0000-0000-0000-000000000001';
const uploadId = 'c0ffee00-0000-0000-0000-000000000001';

const business: Business = {
  id: businessId,
  name: 'Salon One',
  status: 'ACTIVE',
  ownerId: 'b0b00000-0000-0000-0000-000000000009',
  categoryId: null,
  category: null,
  imageUrl: `/api/businesses/${businessId}/image`,
};

const repoWith = (setImage: BusinessRepository['setImage']): BusinessRepository =>
  ({ setImage }) as unknown as BusinessRepository;

describe('SetBusinessImageUseCaseImpl', () => {
  it('claims the upload and returns the updated business', async () => {
    const setImage = vi.fn().mockResolvedValue(business);
    const useCase = new SetBusinessImageUseCaseImpl(repoWith(setImage));

    const result = await useCase.execute(businessId, uploadId);

    expect(setImage).toHaveBeenCalledWith(businessId, { uploadId });
    expect(result).toEqual(business);
  });

  it('propagates a repository failure', async () => {
    const failure = new NotFoundError('Business', businessId);
    const setImage = vi.fn().mockRejectedValue(failure);
    const useCase = new SetBusinessImageUseCaseImpl(repoWith(setImage));

    await expect(useCase.execute(businessId, uploadId)).rejects.toBe(failure);
  });
});
