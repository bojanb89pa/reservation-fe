import type { BusinessMembership, BusinessMemberRole } from '../../entities/BusinessMembership';

export interface ListBusinessMembersUseCase {
  execute(businessId: string, role: BusinessMemberRole): Promise<BusinessMembership[]>;
}
