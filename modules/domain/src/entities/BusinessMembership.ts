export type BusinessMemberRole = 'OWNER' | 'EMPLOYEE';

export interface BusinessMembership {
  id: string;
  businessId: string;
  userId: string;
  role: BusinessMemberRole;
}

export interface AddMemberCommand {
  businessId: string;
  userId: string;
  role: BusinessMemberRole;
}

export interface RemoveMemberCommand {
  businessId: string;
  userId: string;
  role: BusinessMemberRole;
}
