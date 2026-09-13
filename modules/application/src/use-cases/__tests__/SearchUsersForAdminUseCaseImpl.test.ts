import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchUsersForAdminUseCaseImpl } from '../user/SearchUsersForAdminUseCaseImpl';
import type { UserRepository, User, PageResponse } from '@domain';

const user: User = {
  id: 'c0ffee00-0000-0000-0000-000000000001',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  roles: [],
  enabled: true,
  status: 'ACTIVE',
  profilePictureUrl: null,
};

const pageResponse: PageResponse<User> = {
  content: [user],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  nextCursor: null,
  prevCursor: null,
  hasNext: false,
  hasPrevious: false,
};

const filter = { search: 'jane', status: 'ACTIVE' as const };
const pageRequest = { page: 0, size: 20 };

let mockRepo: UserRepository;

beforeEach(() => {
  mockRepo = {
    setProfilePicture: vi.fn(),
    deleteProfilePicture: vi.fn(),
    getUsersByIds: vi.fn(),
    searchForAdmin: vi.fn().mockResolvedValue(pageResponse),
    getByIdForAdmin: vi.fn(),
    createByAdmin: vi.fn(),
    updateByAdmin: vi.fn(),
    updateStatus: vi.fn(),
    resetPassword: vi.fn(),
    deleteByAdmin: vi.fn(),
    searchUsers: vi.fn(),
  };
});

describe('SearchUsersForAdminUseCaseImpl', () => {
  it('delegates to the repository and returns whatever it resolves, unmodified', async () => {
    const useCase = new SearchUsersForAdminUseCaseImpl(mockRepo);

    const result = await useCase.execute(filter, pageRequest);

    expect(mockRepo.searchForAdmin).toHaveBeenCalledWith(filter, pageRequest);
    expect(result).toEqual(pageResponse);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('search failed');
    mockRepo.searchForAdmin = vi.fn().mockRejectedValue(failure);
    const useCase = new SearchUsersForAdminUseCaseImpl(mockRepo);

    await expect(useCase.execute(filter, pageRequest)).rejects.toBe(failure);
  });
});
