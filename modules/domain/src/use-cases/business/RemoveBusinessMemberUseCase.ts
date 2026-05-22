import type { RemoveMemberCommand } from '../../entities/BusinessMembership';

export interface RemoveBusinessMemberUseCase {
  execute(command: RemoveMemberCommand): Promise<void>;
}
