import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RevokeClientApplicationConsentUseCaseImpl } from '../client-application/RevokeClientApplicationConsentUseCaseImpl';
import type { ClientApplicationConsentRepository, ClientApplicationLocationConsent } from '@fe/domain';

let mockRepository: ClientApplicationConsentRepository;

beforeEach(() => {
  mockRepository = {
    getMine: vi.fn(),
    approve: vi.fn(),
    revoke: vi.fn(),
  };
});

describe('RevokeClientApplicationConsentUseCaseImpl', () => {
  it('delegates to repository.revoke and returns the consent', async () => {
    const consent = { id: 'c-1' } as ClientApplicationLocationConsent;
    mockRepository.revoke = vi.fn().mockResolvedValue(consent);

    const result = await new RevokeClientApplicationConsentUseCaseImpl(mockRepository).execute('c-1');

    expect(mockRepository.revoke).toHaveBeenCalledWith('c-1');
    expect(result).toBe(consent);
  });

  it('propagates repository errors', async () => {
    mockRepository.revoke = vi.fn().mockRejectedValue(new Error('not found'));

    await expect(new RevokeClientApplicationConsentUseCaseImpl(mockRepository).execute('x')).rejects.toThrow('not found');
  });
});
