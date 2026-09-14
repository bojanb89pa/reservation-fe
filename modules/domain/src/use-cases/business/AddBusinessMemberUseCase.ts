import type { BusinessMembership, AddMemberCommand } from '../../entities/BusinessMembership';

/**
 * Callable by an admin or an existing owner of `command.businessId` (fe-brief #77) —
 * an employee may not call this. A resolved promise does not prove the membership was
 * actually created: an unauthorized caller also receives a `200`-shaped result with the
 * same fields (fe-brief #77). Callers that must be certain should re-check via
 * `ListBusinessMembersUseCase` after calling this.
 */
export interface AddBusinessMemberUseCase {
  execute(command: AddMemberCommand): Promise<BusinessMembership>;
}
