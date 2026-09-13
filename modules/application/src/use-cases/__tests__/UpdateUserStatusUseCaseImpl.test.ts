import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateUserStatusUseCaseImpl } from '../user/UpdateUserStatusUseCaseImpl';
import type { UserRepository, User, UpdateUserStatusCommand } from '@domain';

const id = 'c0ffee00-0000-0000-0000-000000000001';

const command: UpdateUserStatusCommand = { status: 'BLOCKED' };

const user: User = {
  id,
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  roles: [],
  enabled: true,
  status: 'BLOCKED',
  profilePictureUrl: null,
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
    updateStatus: vi.fn().mockResolvedValue(user),
    resetPassword: vi.fn(),
    deleteByAdmin: vi.fn(),
    searchUsers: vi.fn(),
  };
});

describe('UpdateUserStatusUseCaseImpl', () => {
  it('delegates to the repository and returns whatever it resolves, unmodified', async () => {
    const useCase = new UpdateUserStatusUseCaseImpl(mockRepo);

    const result = await useCase.execute(id, command);

    expect(mockRepo.updateStatus).toHaveBeenCalledWith(id, command);
    expect(result).toEqual(user);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('update status failed');
    mockRepo.updateStatus = vi.fn().mockRejectedValue(failure);
    const useCase = new UpdateUserStatusUseCaseImpl(mockRepo);

    await expect(useCase.execute(id, command)).rejects.toBe(failure);
  });
});
