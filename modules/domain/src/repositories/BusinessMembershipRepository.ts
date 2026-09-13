import type {
  BusinessMembership,
  BusinessMemberRole,
  NotifyBusinessMembershipCommand,
} from '../entities/BusinessMembership';

export interface BusinessMembershipRepository {
  /**
   * `email`, not `userId` — the BE endpoint's request body is `{ email }` (fe-brief #63, #77).
   * A `200` response no longer proves the caller was authorized: admin or an existing owner
   * of `businessId` may call this, but any other caller also gets `200` with the same shape
   * (fe-brief #77) — do not treat the resolved promise alone as confirmation of success.
   */
  add(businessId: string, email: string, role: BusinessMemberRole): Promise<BusinessMembership>;
  remove(businessId: string, userId: string, role: BusinessMemberRole): Promise<void>;
  list(businessId: string, role: BusinessMemberRole): Promise<BusinessMembership[]>;
  notifyMembership(command: NotifyBusinessMembershipCommand): Promise<void>;
}
