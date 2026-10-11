import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateOwnProfileUseCaseImpl } from '../user/UpdateOwnProfileUseCaseImpl';
import type { UserRepository, User, UpdateOwnProfileCommand } from '@domain';

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

const command: UpdateOwnProfileCommand = {
  firstName: 'Jane',
  lastName: 'Doe',
};

let mockRepo: UserRepository;

beforeEach(() => {
  mockRepo = {
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
    searchUsers: vi.fn(),
    updateOwnProfile: vi.fn().mockResolvedValue(user),
  };
});

describe('UpdateOwnProfileUseCaseImpl', () => {
  it('delegates to the repository and returns the updated user', async () => {
    const useCase = new UpdateOwnProfileUseCaseImpl(mockRepo);

    const result = await useCase.execute(command);

    expect(mockRepo.updateOwnProfile).toHaveBeenCalledWith(command);
    expect(result).toEqual(user);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('profile update rejected');
    mockRepo.updateOwnProfile = vi.fn().mockRejectedValue(failure);
    const useCase = new UpdateOwnProfileUseCaseImpl(mockRepo);

    await expect(useCase.execute(command)).rejects.toBe(failure);
  });
});
