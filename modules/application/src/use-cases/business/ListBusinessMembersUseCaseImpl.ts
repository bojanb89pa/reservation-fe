import type { BusinessMembershipRepository, ListBusinessMembersUseCase, BusinessMembership, BusinessMemberRole } from '@domain';

export class ListBusinessMembersUseCaseImpl implements ListBusinessMembersUseCase {
  constructor(private readonly businessMembershipRepository: BusinessMembershipRepository) {}

  execute(businessId: string, role: BusinessMemberRole): Promise<BusinessMembership[]> {
    return this.businessMembershipRepository.list(businessId, role);
  }
}
