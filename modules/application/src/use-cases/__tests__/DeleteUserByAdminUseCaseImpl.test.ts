import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteUserByAdminUseCaseImpl } from '../user/DeleteUserByAdminUseCaseImpl';
import type { UserRepository } from '@domain';

const id = 'c0ffee00-0000-0000-0000-000000000001';

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
    deleteByAdmin: vi.fn().mockResolvedValue(undefined),
    searchUsers: vi.fn(),
  };
});

describe('DeleteUserByAdminUseCaseImpl', () => {
  it('delegates to the repository', async () => {
    const useCase = new DeleteUserByAdminUseCaseImpl(mockRepo);

    const result = await useCase.execute(id);

    expect(mockRepo.deleteByAdmin).toHaveBeenCalledWith(id);
    expect(result).toBeUndefined();
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('delete failed');
    mockRepo.deleteByAdmin = vi.fn().mockRejectedValue(failure);
    const useCase = new DeleteUserByAdminUseCaseImpl(mockRepo);

    await expect(useCase.execute(id)).rejects.toBe(failure);
  });
});
