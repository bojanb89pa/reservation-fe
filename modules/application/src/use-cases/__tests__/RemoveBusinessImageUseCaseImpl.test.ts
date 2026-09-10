import { describe, it, expect, vi } from 'vitest';
import { RemoveBusinessImageUseCaseImpl } from '../business/RemoveBusinessImageUseCaseImpl';
import { NotFoundError } from '@domain';
import type { Business, BusinessRepository } from '@domain';

const businessId = 'a1b2c3d4-0000-0000-0000-000000000001';

const businessWithoutImage: Business = {
  id: businessId,
  name: 'Salon One',
  status: 'ACTIVE',
  ownerId: 'b0b00000-0000-0000-0000-000000000009',
  categoryId: null,
  category: null,
  imageUrl: null,
};

const repoWith = (removeImage: BusinessRepository['removeImage']): BusinessRepository =>
  ({ removeImage }) as unknown as BusinessRepository;

describe('RemoveBusinessImageUseCaseImpl', () => {
  it('removes the image and returns the updated business', async () => {
    const removeImage = vi.fn().mockResolvedValue(businessWithoutImage);
    const useCase = new RemoveBusinessImageUseCaseImpl(repoWith(removeImage));

    const result = await useCase.execute(businessId);

    expect(removeImage).toHaveBeenCalledWith(businessId);
    expect(result.imageUrl).toBeNull();
  });

  it('propagates a repository failure', async () => {
    const failure = new NotFoundError('Business', businessId);
    const removeImage = vi.fn().mockRejectedValue(failure);
    const useCase = new RemoveBusinessImageUseCaseImpl(repoWith(removeImage));

    await expect(useCase.execute(businessId)).rejects.toBe(failure);
  });
});
