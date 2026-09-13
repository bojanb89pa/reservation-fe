import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUsersByIdsUseCaseImpl } from '../user/GetUsersByIdsUseCaseImpl';
import type { UserRepository, User } from '@domain';

const users: User[] = [
  {
    id: 'c0ffee00-0000-0000-0000-000000000001',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    roles: [],
    enabled: true,
    status: 'ACTIVE',
    profilePictureUrl: null,
  },
  {
    id: 'c0ffee00-0000-0000-0000-000000000002',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: [],
    enabled: true,
    status: 'ACTIVE',
    profilePictureUrl: null,
  },
];

const ids = users.map((user) => user.id as string);

let mockRepo: UserRepository;

beforeEach(() => {
  mockRepo = {
    setProfilePicture: vi.fn(),
    deleteProfilePicture: vi.fn(),
    getUsersByIds: vi.fn().mockResolvedValue(users),
    searchForAdmin: vi.fn(),
    getByIdForAdmin: vi.fn(),
    createByAdmin: vi.fn(),
    updateByAdmin: vi.fn(),
    updateStatus: vi.fn(),
    resetPassword: vi.fn(),
    deleteByAdmin: vi.fn(),
    searchUsers: vi.fn(),
  };
});

describe('GetUsersByIdsUseCaseImpl', () => {
  it('delegates to the repository and returns whatever it resolves, unmodified', async () => {
    const useCase = new GetUsersByIdsUseCaseImpl(mockRepo);

    const result = await useCase.execute(ids);

    expect(mockRepo.getUsersByIds).toHaveBeenCalledWith(ids);
    expect(result).toEqual(users);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('lookup failed');
    mockRepo.getUsersByIds = vi.fn().mockRejectedValue(failure);
    const useCase = new GetUsersByIdsUseCaseImpl(mockRepo);

    await expect(useCase.execute(ids)).rejects.toBe(failure);
  });
});
