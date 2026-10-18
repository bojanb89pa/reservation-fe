import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetClientApplicationUseCaseImpl } from '../client-application/GetClientApplicationUseCaseImpl';
import type { ClientApplicationDetail, ClientApplicationRepository } from '@fe/domain';

let mockRepository: ClientApplicationRepository;

beforeEach(() => {
  mockRepository = {
    register: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
  };
});

describe('GetClientApplicationUseCaseImpl', () => {
  it('delegates to repository.getById and returns the detail', async () => {
    const detail = { id: 'app-1' } as ClientApplicationDetail;
    mockRepository.getById = vi.fn().mockResolvedValue(detail);

    const result = await new GetClientApplicationUseCaseImpl(mockRepository).execute('app-1');

    expect(mockRepository.getById).toHaveBeenCalledWith('app-1');
    expect(result).toEqual(detail);
  });

  it('propagates repository errors', async () => {
    mockRepository.getById = vi.fn().mockRejectedValue(new Error('not found'));

    await expect(new GetClientApplicationUseCaseImpl(mockRepository).execute('x')).rejects.toThrow('not found');
  });
});
