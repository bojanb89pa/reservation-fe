import { describe, it, expect, vi } from 'vitest';
import { SearchUsersUseCaseImpl } from '../user/SearchUsersUseCaseImpl';
import type { UserRepository } from '@domain';

const mockUsers = [
  { id: 'a1b2c3d4-0000-0000-0000-000000000001', firstName: 'John', lastName: 'Doe' },
  { id: 'e5f6a7b8-0000-0000-0000-000000000002', firstName: 'Jane', lastName: 'Smith' },
];

const mockRepo: UserRepository = {
  setProfilePicture: vi.fn(),
  deleteProfilePicture: vi.fn(),
  getUsersByIds: vi.fn(),
  searchForAdmin: vi.fn(),
  getByIdForAdmin: vi.fn(),
  createByAdmin: vi.fn(),
  updateByAdmin: vi.fn(),
  updateStatus: vi.fn(),
  resetPassword: vi.fn(),
  deleteByAdmin: vi.fn(),
  searchUsers: vi.fn().mockResolvedValue(mockUsers),
};

describe('SearchUsersUseCaseImpl', () => {
  it('returns user summaries matching the search query', async () => {
    const useCase = new SearchUsersUseCaseImpl(mockRepo);
    const result = await useCase.execute({ query: 'John' });

    expect(mockRepo.searchUsers).toHaveBeenCalledWith({ query: 'John' });
    expect(result).toHaveLength(2);
    expect(result[0]!.firstName).toBe('John');
  });

  it('passes search query to repository', async () => {
    const useCase = new SearchUsersUseCaseImpl(mockRepo);
    await useCase.execute({ query: 'Jane' });

    expect(mockRepo.searchUsers).toHaveBeenCalledWith({ query: 'Jane' });
  });

  it('returns empty array when no users match', async () => {
    const emptyMockRepo: UserRepository = {
      ...mockRepo,
      searchUsers: vi.fn().mockResolvedValue([]),
    };

    const useCase = new SearchUsersUseCaseImpl(emptyMockRepo);
    const result = await useCase.execute({ query: 'NonExistent' });

    expect(result).toHaveLength(0);
  });
});
