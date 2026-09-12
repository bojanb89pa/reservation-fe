import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateUserByAdminUseCaseImpl } from '../user/UpdateUserByAdminUseCaseImpl';
import type { UserRepository, User, AdminUpdateUserCommand } from '@domain';

const id = 'c0ffee00-0000-0000-0000-000000000001';

const command: AdminUpdateUserCommand = {
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  roles: [],
};

const user: User = {
  id,
  email: command.email,
  firstName: command.firstName,
  lastName: command.lastName,
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
    getByIdForAdmin: vi.fn(),
    createByAdmin: vi.fn(),
    updateByAdmin: vi.fn().mockResolvedValue(user),
    updateStatus: vi.fn(),
    resetPassword: vi.fn(),
    deleteByAdmin: vi.fn(),
  };
});

describe('UpdateUserByAdminUseCaseImpl', () => {
  it('delegates to the repository and returns whatever it resolves, unmodified', async () => {
    const useCase = new UpdateUserByAdminUseCaseImpl(mockRepo);

    const result = await useCase.execute(id, command);

    expect(mockRepo.updateByAdmin).toHaveBeenCalledWith(id, command);
    expect(result).toEqual(user);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('update failed');
    mockRepo.updateByAdmin = vi.fn().mockRejectedValue(failure);
    const useCase = new UpdateUserByAdminUseCaseImpl(mockRepo);

    await expect(useCase.execute(id, command)).rejects.toBe(failure);
  });
});
