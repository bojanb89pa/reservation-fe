import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResetUserPasswordUseCaseImpl } from '../user/ResetUserPasswordUseCaseImpl';
import type { UserRepository, User, ResetUserPasswordCommand } from '@domain';

const id = 'c0ffee00-0000-0000-0000-000000000001';

const command: ResetUserPasswordCommand = { newPassword: 'N3wS3curePass!' };

const user: User = {
  id,
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
    getByIdForAdmin: vi.fn(),
    createByAdmin: vi.fn(),
    updateByAdmin: vi.fn(),
    updateStatus: vi.fn(),
    resetPassword: vi.fn().mockResolvedValue(user),
    deleteByAdmin: vi.fn(),
  };
});

describe('ResetUserPasswordUseCaseImpl', () => {
  it('delegates to the repository and returns whatever it resolves, unmodified', async () => {
    const useCase = new ResetUserPasswordUseCaseImpl(mockRepo);

    const result = await useCase.execute(id, command);

    expect(mockRepo.resetPassword).toHaveBeenCalledWith(id, command);
    expect(result).toEqual(user);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('reset password failed');
    mockRepo.resetPassword = vi.fn().mockRejectedValue(failure);
    const useCase = new ResetUserPasswordUseCaseImpl(mockRepo);

    await expect(useCase.execute(id, command)).rejects.toBe(failure);
  });
});
