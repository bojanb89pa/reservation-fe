import { describe, it, expect, vi } from 'vitest';
import { RemoveBusinessMemberUseCaseImpl } from '../business/RemoveBusinessMemberUseCaseImpl';
import type { BusinessMembershipRepository } from '@domain';

const mockRepo: BusinessMembershipRepository = {
  add: vi.fn(),
  remove: vi.fn().mockResolvedValue(undefined),
  list: vi.fn(),
  notifyMembership: vi.fn(),
};

describe('RemoveBusinessMemberUseCaseImpl', () => {
  it('removes a member from business', async () => {
    const useCase = new RemoveBusinessMemberUseCaseImpl(mockRepo);
    const command = {
      businessId: 'biz-001',
      userId: 'user-001',
      role: 'OWNER' as const,
    };

    await useCase.execute(command);

    expect(mockRepo.remove).toHaveBeenCalledWith('biz-001', 'user-001', 'OWNER');
  });

  it('removes employee member', async () => {
    const useCase = new RemoveBusinessMemberUseCaseImpl(mockRepo);
    const command = {
      businessId: 'biz-002',
      userId: 'user-002',
      role: 'EMPLOYEE' as const,
    };

    await useCase.execute(command);

    expect(mockRepo.remove).toHaveBeenCalledWith('biz-002', 'user-002', 'EMPLOYEE');
  });

  it('passes correct command parameters to repository', async () => {
    const useCase = new RemoveBusinessMemberUseCaseImpl(mockRepo);
    const command = {
      businessId: 'biz-003',
      userId: 'user-003',
      role: 'OWNER' as const,
    };

    await useCase.execute(command);

    expect(mockRepo.remove).toHaveBeenCalledTimes(1);
    expect(mockRepo.remove).toHaveBeenCalledWith(command.businessId, command.userId, command.role);
  });
});
