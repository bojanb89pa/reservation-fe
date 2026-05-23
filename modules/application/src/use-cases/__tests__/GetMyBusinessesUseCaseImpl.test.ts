import { describe, it, expect, vi } from 'vitest';
import { GetMyBusinessesUseCaseImpl } from '../business/GetMyBusinessesUseCaseImpl';
import type { BusinessRepository } from '@domain';

const mockPage = {
  content: [
    { id: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'Salon One' },
    { id: 'e5f6a7b8-0000-0000-0000-000000000002', name: 'Salon Two' },
  ],
  page: 0,
  size: 20,
  totalElements: 2,
  totalPages: 1,
};

const mockRepo: BusinessRepository = {
  getAll: vi.fn(),
  getMyBusinesses: vi.fn().mockResolvedValue(mockPage),
  search: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
};

describe('GetMyBusinessesUseCaseImpl', () => {
  it('returns paged businesses the user belongs to', async () => {
    const useCase = new GetMyBusinessesUseCaseImpl(mockRepo);
    const result = await useCase.execute({ page: 0, size: 20 });

    expect(mockRepo.getMyBusinesses).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(result.content).toHaveLength(2);
    expect(result.content[0]!.name).toBe('Salon One');
  });

  it('passes custom page/size to repository', async () => {
    const useCase = new GetMyBusinessesUseCaseImpl(mockRepo);
    await useCase.execute({ page: 2, size: 5 });

    expect(mockRepo.getMyBusinesses).toHaveBeenCalledWith({ page: 2, size: 5 });
  });
});
