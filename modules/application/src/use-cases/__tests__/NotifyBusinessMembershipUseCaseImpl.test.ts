import { describe, it, expect, vi } from 'vitest';
import { NotifyBusinessMembershipUseCaseImpl } from '../business/NotifyBusinessMembershipUseCaseImpl';
import type { BusinessMembershipRepository } from '@domain';

const mockRepo: BusinessMembershipRepository = {
  add: vi.fn(),
  remove: vi.fn(),
  list: vi.fn(),
  notifyMembership: vi.fn().mockResolvedValue(undefined),
};

describe('NotifyBusinessMembershipUseCaseImpl', () => {
  it('notifies about business membership', async () => {
    const useCase = new NotifyBusinessMembershipUseCaseImpl(mockRepo);
    const command = {
      businessId: 'b1b2b3b4-0000-0000-0000-000000000001',
      userId: 'u1u2u3u4-0000-0000-0000-000000000001',
      role: 'MANAGER' as const,
    };

    await useCase.execute(command);

    expect(mockRepo.notifyMembership).toHaveBeenCalledWith(command);
  });

  it('passes correct command to repository', async () => {
    const useCase = new NotifyBusinessMembershipUseCaseImpl(mockRepo);
    const command = {
      businessId: 'b1b2b3b4-0000-0000-0000-000000000002',
      userId: 'u1u2u3u4-0000-0000-0000-000000000002',
      role: 'MEMBER' as const,
    };

    await useCase.execute(command);

    expect(mockRepo.notifyMembership).toHaveBeenCalledWith(command);
  });
});
