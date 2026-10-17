import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApproveClientApplicationConsentUseCaseImpl } from '../client-application/ApproveClientApplicationConsentUseCaseImpl';
import type { ClientApplicationConsentRepository, ClientApplicationLocationConsent } from '@fe/domain';

let mockRepository: ClientApplicationConsentRepository;

beforeEach(() => {
  mockRepository = {
    getMine: vi.fn(),
    approve: vi.fn(),
    revoke: vi.fn(),
  };
});

describe('ApproveClientApplicationConsentUseCaseImpl', () => {
  it('delegates to repository.approve and returns the consent', async () => {
    const consent = { id: 'c-1' } as ClientApplicationLocationConsent;
    mockRepository.approve = vi.fn().mockResolvedValue(consent);

    const result = await new ApproveClientApplicationConsentUseCaseImpl(mockRepository).execute('c-1');

    expect(mockRepository.approve).toHaveBeenCalledWith('c-1');
    expect(result).toBe(consent);
  });

  it('propagates repository errors', async () => {
    mockRepository.approve = vi.fn().mockRejectedValue(new Error('not found'));

    await expect(new ApproveClientApplicationConsentUseCaseImpl(mockRepository).execute('x')).rejects.toThrow('not found');
  });
});
