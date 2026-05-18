import { describe, it, expect, vi } from 'vitest';
import { GetAllBusinessesUseCaseImpl } from '../business/GetAllBusinessesUseCaseImpl';
import type { BusinessRepository } from '@domain';

const mockPage = {
  content: [{ id: 'biz-1', name: 'Test Business' }],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

const mockRepo: BusinessRepository = {
  getAll: vi.fn().mockResolvedValue(mockPage),
  getById: vi.fn(),
  create: vi.fn(),
};

describe('GetAllBusinessesUseCaseImpl', () => {
  it('returns paged businesses from repository', async () => {
    const useCase = new GetAllBusinessesUseCaseImpl(mockRepo);
    const result = await useCase.execute({ page: 0, size: 20 });

    expect(mockRepo.getAll).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(result.content).toHaveLength(1);
    expect(result.content[0]!.name).toBe('Test Business');
  });
});
