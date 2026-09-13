import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetProfilePictureUseCaseImpl } from '../user/SetProfilePictureUseCaseImpl';
import type { UserRepository, User, SetProfilePictureCommand } from '@domain';

const user: User = {
  id: 'c0ffee00-0000-0000-0000-000000000001',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  roles: [],
  enabled: true,
  status: 'ACTIVE',
  profilePictureUrl: '/auth/users/c0ffee00-0000-0000-0000-000000000001/profile-picture',
};

const command: SetProfilePictureCommand = {
  uploadId: 'c0ffee00-0000-0000-0000-000000000002',
};

let mockRepo: UserRepository;

beforeEach(() => {
  mockRepo = {
    setProfilePicture: vi.fn().mockResolvedValue(user),
    deleteProfilePicture: vi.fn(),
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

describe('SetProfilePictureUseCaseImpl', () => {
  it('delegates to the repository and returns the updated user', async () => {
    const useCase = new SetProfilePictureUseCaseImpl(mockRepo);

    const result = await useCase.execute(command);

    expect(mockRepo.setProfilePicture).toHaveBeenCalledWith(command);
    expect(result).toEqual(user);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('upload not found');
    mockRepo.setProfilePicture = vi.fn().mockRejectedValue(failure);
    const useCase = new SetProfilePictureUseCaseImpl(mockRepo);

    await expect(useCase.execute(command)).rejects.toBe(failure);
  });
});
