export type BusinessMemberRole = 'OWNER' | 'EMPLOYEE';

/**
 * `userId`/`email` are mutually-null-aware: a membership added by email for an
 * unregistered account is "pending" (`userId: null`) until BE resolves it once that
 * person registers — mirrors BE `BusinessMembershipResponse` exactly (fe-brief tickets #63, #77).
 */
export interface BusinessMembership {
  id: string;
  businessId: string;
  userId: string | null;
  email: string | null;
  role: BusinessMemberRole;
}

/**
 * The resource-service add-owner/add-employee endpoints accept only `email` in the
 * request body, never `userId` — confirmed by BE fe-briefs for tickets #63 and #77.
 */
export interface AddMemberCommand {
  businessId: string;
  email: string;
  role: BusinessMemberRole;
}

export interface RemoveMemberCommand {
  businessId: string;
  userId: string;
  role: BusinessMemberRole;
}

export interface NotifyBusinessMembershipCommand {
  email: string;
  businessName: string;
  role: BusinessMemberRole;
}
