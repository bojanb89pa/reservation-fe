import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteProfilePictureUseCaseImpl } from '../user/DeleteProfilePictureUseCaseImpl';
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
    deleteProfilePicture: vi.fn().mockResolvedValue(user),
    getUsersByIds: vi.fn(),
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

describe('DeleteProfilePictureUseCaseImpl', () => {
  it('delegates to the repository and returns the updated user', async () => {
    const useCase = new DeleteProfilePictureUseCaseImpl(mockRepo);

    const result = await useCase.execute();

    expect(mockRepo.deleteProfilePicture).toHaveBeenCalled();
    expect(result).toEqual(user);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('nothing to delete');
    mockRepo.deleteProfilePicture = vi.fn().mockRejectedValue(failure);
    const useCase = new DeleteProfilePictureUseCaseImpl(mockRepo);

    await expect(useCase.execute()).rejects.toBe(failure);
  });
});
