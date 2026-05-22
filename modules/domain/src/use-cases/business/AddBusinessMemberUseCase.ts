import type { BusinessMembership, AddMemberCommand } from '../../entities/BusinessMembership';

export interface AddBusinessMemberUseCase {
  execute(command: AddMemberCommand): Promise<BusinessMembership>;
}
