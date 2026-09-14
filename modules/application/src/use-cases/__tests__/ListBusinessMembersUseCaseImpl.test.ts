import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListBusinessMembersUseCaseImpl } from '../business/ListBusinessMembersUseCaseImpl';
import type { BusinessMembershipRepository } from '@domain';

const mockMembers = [
  {
    id: '11111111-0000-0000-0000-000000000001',
    businessId: 'biz-001',
    userId: 'user-001',
    email: 'owner@example.com',
    role: 'OWNER' as const,
  },
  {
    id: '22222222-0000-0000-0000-000000000002',
    businessId: 'biz-001',
    userId: null,
    email: 'pending@example.com',
    role: 'OWNER' as const,
  },
];

let mockRepo: BusinessMembershipRepository;

beforeEach(() => {
  mockRepo = {
    add: vi.fn(),
    remove: vi.fn(),
    list: vi.fn().mockResolvedValue(mockMembers),
    notifyMembership: vi.fn(),
  };
});

describe('ListBusinessMembersUseCaseImpl', () => {
  it('lists members by business and role', async () => {
    const useCase = new ListBusinessMembersUseCaseImpl(mockRepo);
    const result = await useCase.execute('biz-001', 'OWNER');

    expect(mockRepo.list).toHaveBeenCalledWith('biz-001', 'OWNER');
    expect(result).toHaveLength(2);
  });

  it('includes registered and pending members', async () => {
    const useCase = new ListBusinessMembersUseCaseImpl(mockRepo);
    const result = await useCase.execute('biz-001', 'OWNER');

    const registered = result.find(m => m.userId !== null);
    const pending = result.find(m => m.userId === null);

    expect(registered).toBeDefined();
    expect(pending).toBeDefined();
    expect(registered?.email).toBe('owner@example.com');
    expect(pending?.email).toBe('pending@example.com');
  });

  it('returns empty array when no members found', async () => {
    mockRepo.list = vi.fn().mockResolvedValue([]);

    const useCase = new ListBusinessMembersUseCaseImpl(mockRepo);
    const result = await useCase.execute('biz-002', 'EMPLOYEE');

    expect(mockRepo.list).toHaveBeenCalledWith('biz-002', 'EMPLOYEE');
    expect(result).toHaveLength(0);
  });

  it('filters by employee role', async () => {
    const employeeMembers = [
      {
        id: '33333333-0000-0000-0000-000000000003',
        businessId: 'biz-001',
        userId: 'user-002',
        email: 'employee@example.com',
        role: 'EMPLOYEE' as const,
      },
    ];
    mockRepo.list = vi.fn().mockResolvedValue(employeeMembers);

    const useCase = new ListBusinessMembersUseCaseImpl(mockRepo);
    const result = await useCase.execute('biz-001', 'EMPLOYEE');

    expect(mockRepo.list).toHaveBeenCalledWith('biz-001', 'EMPLOYEE');
    expect(result[0]?.role).toBe('EMPLOYEE');
  });
});
