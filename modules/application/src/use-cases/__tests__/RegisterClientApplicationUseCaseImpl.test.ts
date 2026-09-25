import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterClientApplicationUseCaseImpl } from '../client-application/RegisterClientApplicationUseCaseImpl';
import type { ClientApplication, ClientApplicationRepository, CreateClientApplicationCommand, ValidationError } from '@domain';

const mockClientApplication: ClientApplication = {
  id: 'app-123',
  name: 'My Client App',
  scope: { type: 'SINGLE_LOCATION', locationId: 'loc-001' },
  enabled: true,
};

let mockRepository: ClientApplicationRepository;

beforeEach(() => {
  mockRepository = {
    register: vi.fn().mockResolvedValue(mockClientApplication),
  };
});

describe('RegisterClientApplicationUseCaseImpl', () => {
  it('delegates to repository.register and returns the registered application', async () => {
    const useCase = new RegisterClientApplicationUseCaseImpl(mockRepository);
    const command: CreateClientApplicationCommand = {
      name: 'My Client App',
      scope: { type: 'SINGLE_LOCATION', locationId: 'loc-001' },
    };

    const result = await useCase.execute(command);

    expect(mockRepository.register).toHaveBeenCalledWith(command);
    expect(result).toEqual(mockClientApplication);
    expect(result.id).toBe('app-123');
    expect(result.enabled).toBe(true);
  });

  it('propagates repository errors', async () => {
    const error = new Error('ValidationError: invalid scope') as ValidationError;
    mockRepository.register = vi.fn().mockRejectedValue(error);

    const useCase = new RegisterClientApplicationUseCaseImpl(mockRepository);
    const command: CreateClientApplicationCommand = {
      name: 'Invalid App',
      scope: { type: 'SINGLE_LOCATION', locationId: '' },
    };

    await expect(useCase.execute(command)).rejects.toThrow('ValidationError: invalid scope');
  });

  it('handles multiple locations scope', async () => {
    const multiLocAppResult: ClientApplication = {
      id: 'app-456',
      name: 'Multi Location App',
      scope: { type: 'MULTIPLE_LOCATIONS', businessId: 'biz-001', locationIds: ['loc-001', 'loc-002'] },
      enabled: true,
    };
    mockRepository.register = vi.fn().mockResolvedValue(multiLocAppResult);

    const useCase = new RegisterClientApplicationUseCaseImpl(mockRepository);
    const command: CreateClientApplicationCommand = {
      name: 'Multi Location App',
      scope: { type: 'MULTIPLE_LOCATIONS', businessId: 'biz-001', locationIds: ['loc-001', 'loc-002'] },
    };

    const result = await useCase.execute(command);

    expect(result.scope).toEqual({ type: 'MULTIPLE_LOCATIONS', businessId: 'biz-001', locationIds: ['loc-001', 'loc-002'] });
  });
});
