import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListClientApplicationsUseCaseImpl } from '../client-application/ListClientApplicationsUseCaseImpl';
import type { ClientApplication, ClientApplicationRepository } from '@fe/domain';

let mockRepository: ClientApplicationRepository;

beforeEach(() => {
  mockRepository = {
    register: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
  };
});

describe('ListClientApplicationsUseCaseImpl', () => {
  it('delegates to repository.getAll and returns the applications', async () => {
    const apps = [{ id: 'app-1' }, { id: 'app-2' }] as ClientApplication[];
    mockRepository.getAll = vi.fn().mockResolvedValue(apps);

    const result = await new ListClientApplicationsUseCaseImpl(mockRepository).execute();

    expect(mockRepository.getAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(apps);
  });

  it('propagates repository errors', async () => {
    mockRepository.getAll = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(new ListClientApplicationsUseCaseImpl(mockRepository).execute()).rejects.toThrow('boom');
  });
});
