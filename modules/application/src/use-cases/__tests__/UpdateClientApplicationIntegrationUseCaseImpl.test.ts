import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateClientApplicationIntegrationUseCaseImpl } from '../client-application/UpdateClientApplicationIntegrationUseCaseImpl';
import type {
  ClientApplicationIntegration,
  ClientApplicationIntegrationRepository,
  UpdateClientApplicationIntegrationCommand,
} from '@fe/domain';

let mockRepository: ClientApplicationIntegrationRepository;

const command = { clientApplicationId: 'app-1' } as UpdateClientApplicationIntegrationCommand;

beforeEach(() => {
  mockRepository = {
    getIntegration: vi.fn(),
    updateIntegration: vi.fn(),
    getPublicIntegration: vi.fn(),
  };
});

describe('UpdateClientApplicationIntegrationUseCaseImpl', () => {
  it('delegates to repository.updateIntegration and returns the integration', async () => {
    const integration = {} as ClientApplicationIntegration;
    mockRepository.updateIntegration = vi.fn().mockResolvedValue(integration);

    const result = await new UpdateClientApplicationIntegrationUseCaseImpl(mockRepository).execute(command);

    expect(mockRepository.updateIntegration).toHaveBeenCalledWith(command);
    expect(result).toBe(integration);
  });

  it('propagates repository errors', async () => {
    mockRepository.updateIntegration = vi.fn().mockRejectedValue(new Error('invalid origin'));

    await expect(new UpdateClientApplicationIntegrationUseCaseImpl(mockRepository).execute(command)).rejects.toThrow(
      'invalid origin',
    );
  });
});
