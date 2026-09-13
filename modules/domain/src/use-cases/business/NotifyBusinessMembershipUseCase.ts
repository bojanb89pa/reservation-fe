import type { NotifyBusinessMembershipCommand } from '../../entities/BusinessMembership';

export interface NotifyBusinessMembershipUseCase {
  execute(command: NotifyBusinessMembershipCommand): Promise<void>;
}
