import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetClientApplicationIntegrationUseCaseImpl } from '../client-application/GetClientApplicationIntegrationUseCaseImpl';
import type { ClientApplicationIntegration, ClientApplicationIntegrationRepository } from '@fe/domain';

let mockRepository: ClientApplicationIntegrationRepository;

beforeEach(() => {
  mockRepository = {
    getIntegration: vi.fn(),
    updateIntegration: vi.fn(),
    getPublicIntegration: vi.fn(),
  };
});

describe('GetClientApplicationIntegrationUseCaseImpl', () => {
  it('delegates to repository.getIntegration and returns the integration', async () => {
    const integration = {} as ClientApplicationIntegration;
    mockRepository.getIntegration = vi.fn().mockResolvedValue(integration);

    const result = await new GetClientApplicationIntegrationUseCaseImpl(mockRepository).execute('app-1');

    expect(mockRepository.getIntegration).toHaveBeenCalledWith('app-1');
    expect(result).toBe(integration);
  });

  it('propagates repository errors', async () => {
    mockRepository.getIntegration = vi.fn().mockRejectedValue(new Error('not found'));

    await expect(new GetClientApplicationIntegrationUseCaseImpl(mockRepository).execute('x')).rejects.toThrow('not found');
  });
});
