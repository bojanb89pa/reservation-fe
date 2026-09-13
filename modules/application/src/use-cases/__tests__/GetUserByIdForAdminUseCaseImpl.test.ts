import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUserByIdForAdminUseCaseImpl } from '../user/GetUserByIdForAdminUseCaseImpl';
import type { UserRepository, User } from '@domain';

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

let mockRepo: UserRepository;

beforeEach(() => {
  mockRepo = {
    setProfilePicture: vi.fn(),
    deleteProfilePicture: vi.fn(),
    getUsersByIds: vi.fn(),
    searchForAdmin: vi.fn(),
    getByIdForAdmin: vi.fn().mockResolvedValue(user),
    createByAdmin: vi.fn(),
    updateByAdmin: vi.fn(),
    updateStatus: vi.fn(),
    resetPassword: vi.fn(),
    deleteByAdmin: vi.fn(),
    searchUsers: vi.fn(),
  };
});

describe('GetUserByIdForAdminUseCaseImpl', () => {
  it('delegates to the repository and returns whatever it resolves, unmodified', async () => {
    const useCase = new GetUserByIdForAdminUseCaseImpl(mockRepo);

    const result = await useCase.execute(user.id as string);

    expect(mockRepo.getByIdForAdmin).toHaveBeenCalledWith(user.id);
    expect(result).toEqual(user);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('not found');
    mockRepo.getByIdForAdmin = vi.fn().mockRejectedValue(failure);
    const useCase = new GetUserByIdForAdminUseCaseImpl(mockRepo);

    await expect(useCase.execute(user.id as string)).rejects.toBe(failure);
  });
});
