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
      email: 'user@example.com',
      businessName: 'Acme Corp',
      role: 'OWNER' as const,
    };

    await useCase.execute(command);

    expect(mockRepo.notifyMembership).toHaveBeenCalledWith(command);
  });

  it('passes correct command to repository', async () => {
    const useCase = new NotifyBusinessMembershipUseCaseImpl(mockRepo);
    const command = {
      email: 'another@example.com',
      businessName: 'Tech Inc',
      role: 'EMPLOYEE' as const,
    };

    await useCase.execute(command);

    expect(mockRepo.notifyMembership).toHaveBeenCalledWith(command);
  });
});
