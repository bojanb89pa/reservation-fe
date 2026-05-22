import type { BusinessMembership, BusinessMemberRole } from '../entities/BusinessMembership';

export interface BusinessMembershipRepository {
  add(businessId: string, userId: string, role: BusinessMemberRole): Promise<BusinessMembership>;
  remove(businessId: string, userId: string, role: BusinessMemberRole): Promise<void>;
  list(businessId: string, role: BusinessMemberRole): Promise<BusinessMembership[]>;
}
