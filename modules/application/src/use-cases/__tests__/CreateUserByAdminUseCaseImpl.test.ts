import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateUserByAdminUseCaseImpl } from '../user/CreateUserByAdminUseCaseImpl';
import type { UserRepository, User, AdminCreateUserCommand } from '@domain';

const command: AdminCreateUserCommand = {
  email: 'jane@example.com',
  password: 'S3curePass!',
  firstName: 'Jane',
  lastName: 'Doe',
  roles: [],
};

const user: User = {
  id: 'c0ffee00-0000-0000-0000-000000000001',
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
    createByAdmin: vi.fn().mockResolvedValue(user),
    updateByAdmin: vi.fn(),
    updateStatus: vi.fn(),
    resetPassword: vi.fn(),
    deleteByAdmin: vi.fn(),
    searchUsers: vi.fn(),
  };
});

describe('CreateUserByAdminUseCaseImpl', () => {
  it('delegates to the repository and returns whatever it resolves, unmodified', async () => {
    const useCase = new CreateUserByAdminUseCaseImpl(mockRepo);

    const result = await useCase.execute(command);

    expect(mockRepo.createByAdmin).toHaveBeenCalledWith(command);
    expect(result).toEqual(user);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('create failed');
    mockRepo.createByAdmin = vi.fn().mockRejectedValue(failure);
    const useCase = new CreateUserByAdminUseCaseImpl(mockRepo);

    await expect(useCase.execute(command)).rejects.toBe(failure);
  });
});
