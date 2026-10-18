import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetClientApplicationEnabledUseCaseImpl } from '../client-application/SetClientApplicationEnabledUseCaseImpl';
import type { ClientApplication, ClientApplicationRepository, SetClientApplicationEnabledCommand } from '@fe/domain';
import { ValidationError } from '@fe/domain';

let mockRepository: ClientApplicationRepository;

beforeEach(() => {
  mockRepository = {
    register: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    setEnabled: vi.fn(),
  };
});

describe('SetClientApplicationEnabledUseCaseImpl', () => {
  it('delegates to repository.setEnabled and returns the updated application', async () => {
    const updated = { id: 'app-1', enabled: false } as ClientApplication;
    mockRepository.setEnabled = vi.fn().mockResolvedValue(updated);
    const command: SetClientApplicationEnabledCommand = { clientApplicationId: 'app-1', enabled: false };

    const result = await new SetClientApplicationEnabledUseCaseImpl(mockRepository).execute(command);

    expect(mockRepository.setEnabled).toHaveBeenCalledWith(command);
    expect(result).toEqual(updated);
  });

  it('rejects with ValidationError and does not call the repository when clientApplicationId is empty', async () => {
    const command: SetClientApplicationEnabledCommand = { clientApplicationId: '', enabled: true };

    const promise = new SetClientApplicationEnabledUseCaseImpl(mockRepository).execute(command);

    await expect(promise).rejects.toBeInstanceOf(ValidationError);
    expect(mockRepository.setEnabled).not.toHaveBeenCalled();
  });

  it('propagates repository errors', async () => {
    mockRepository.setEnabled = vi.fn().mockRejectedValue(new Error('not found'));
    const command: SetClientApplicationEnabledCommand = { clientApplicationId: 'x', enabled: true };

    await expect(new SetClientApplicationEnabledUseCaseImpl(mockRepository).execute(command)).rejects.toThrow('not found');
  });
});
