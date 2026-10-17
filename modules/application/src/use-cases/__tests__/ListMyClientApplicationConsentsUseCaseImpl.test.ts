import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListMyClientApplicationConsentsUseCaseImpl } from '../client-application/ListMyClientApplicationConsentsUseCaseImpl';
import type { ClientApplicationConsentRepository, OwnerClientApplicationConsent } from '@fe/domain';

let mockRepository: ClientApplicationConsentRepository;

beforeEach(() => {
  mockRepository = {
    getMine: vi.fn(),
    approve: vi.fn(),
    revoke: vi.fn(),
  };
});

describe('ListMyClientApplicationConsentsUseCaseImpl', () => {
  it('delegates to repository.getMine and returns the consents', async () => {
    const consents = [{ id: 'c-1' }] as OwnerClientApplicationConsent[];
    mockRepository.getMine = vi.fn().mockResolvedValue(consents);

    const result = await new ListMyClientApplicationConsentsUseCaseImpl(mockRepository).execute();

    expect(mockRepository.getMine).toHaveBeenCalledTimes(1);
    expect(result).toEqual(consents);
  });

  it('propagates repository errors', async () => {
    mockRepository.getMine = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(new ListMyClientApplicationConsentsUseCaseImpl(mockRepository).execute()).rejects.toThrow('boom');
  });
});
