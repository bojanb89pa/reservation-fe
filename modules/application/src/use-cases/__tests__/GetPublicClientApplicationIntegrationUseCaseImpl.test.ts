import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPublicClientApplicationIntegrationUseCaseImpl } from '../client-application/GetPublicClientApplicationIntegrationUseCaseImpl';
import type { ClientApplicationIntegrationRepository, PublicClientApplicationIntegration } from '@fe/domain';

let mockRepository: ClientApplicationIntegrationRepository;

beforeEach(() => {
  mockRepository = {
    getIntegration: vi.fn(),
    updateIntegration: vi.fn(),
    getPublicIntegration: vi.fn(),
  };
});

describe('GetPublicClientApplicationIntegrationUseCaseImpl', () => {
  it('delegates to repository.getPublicIntegration and returns the integration', async () => {
    const integration = {} as PublicClientApplicationIntegration;
    mockRepository.getPublicIntegration = vi.fn().mockResolvedValue(integration);

    const result = await new GetPublicClientApplicationIntegrationUseCaseImpl(mockRepository).execute('app-1');

    expect(mockRepository.getPublicIntegration).toHaveBeenCalledWith('app-1');
    expect(result).toBe(integration);
  });

  it('returns null when no integration is configured', async () => {
    mockRepository.getPublicIntegration = vi.fn().mockResolvedValue(null);

    const result = await new GetPublicClientApplicationIntegrationUseCaseImpl(mockRepository).execute('app-1');

    expect(result).toBeNull();
  });

  it('propagates repository errors', async () => {
    mockRepository.getPublicIntegration = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(new GetPublicClientApplicationIntegrationUseCaseImpl(mockRepository).execute('x')).rejects.toThrow('boom');
  });
});
