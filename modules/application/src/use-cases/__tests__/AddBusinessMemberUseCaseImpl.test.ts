import { describe, it, expect, vi } from 'vitest';
import { AddBusinessMemberUseCaseImpl } from '../business/AddBusinessMemberUseCaseImpl';
import type { BusinessMembershipRepository } from '@domain';

const mockBusinessMembership = {
  id: '12345678-0000-0000-0000-000000000001',
  businessId: 'biz-001',
  userId: null,
  email: 'user@example.com',
  role: 'OWNER' as const,
};

const mockRepo: BusinessMembershipRepository = {
  add: vi.fn().mockResolvedValue(mockBusinessMembership),
  remove: vi.fn(),
  list: vi.fn(),
  notifyMembership: vi.fn(),
};

describe('AddBusinessMemberUseCaseImpl', () => {
  it('adds a member with email to a business', async () => {
    const useCase = new AddBusinessMemberUseCaseImpl(mockRepo);
    const command = {
      businessId: 'biz-001',
      email: 'user@example.com',
      role: 'OWNER' as const,
    };

    const result = await useCase.execute(command);

    expect(mockRepo.add).toHaveBeenCalledWith('biz-001', 'user@example.com', 'OWNER');
    expect(result.email).toBe('user@example.com');
    expect(result.businessId).toBe('biz-001');
  });

  it('handles employee role', async () => {
    const employeeMembership = { ...mockBusinessMembership, role: 'EMPLOYEE' as const };
    mockRepo.add = vi.fn().mockResolvedValue(employeeMembership);

    const useCase = new AddBusinessMemberUseCaseImpl(mockRepo);
    const command = {
      businessId: 'biz-002',
      email: 'employee@example.com',
      role: 'EMPLOYEE' as const,
    };

    const result = await useCase.execute(command);

    expect(mockRepo.add).toHaveBeenCalledWith('biz-002', 'employee@example.com', 'EMPLOYEE');
    expect(result.role).toBe('EMPLOYEE');
  });

  it('returns pending membership when user not yet registered', async () => {
    const pendingMembership = {
      id: '87654321-0000-0000-0000-000000000002',
      businessId: 'biz-003',
      userId: null,
      email: 'pending@example.com',
      role: 'OWNER' as const,
    };
    mockRepo.add = vi.fn().mockResolvedValue(pendingMembership);

    const useCase = new AddBusinessMemberUseCaseImpl(mockRepo);
    const command = {
      businessId: 'biz-003',
      email: 'pending@example.com',
      role: 'OWNER' as const,
    };

    const result = await useCase.execute(command);

    expect(result.userId).toBeNull();
    expect(result.email).toBe('pending@example.com');
  });
});
