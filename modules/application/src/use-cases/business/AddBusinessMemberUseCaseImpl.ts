import type {
  BusinessMembershipRepository,
  AddBusinessMemberUseCase,
  BusinessMembership,
  AddMemberCommand,
} from '@domain';

export class AddBusinessMemberUseCaseImpl implements AddBusinessMemberUseCase {
  constructor(private readonly businessMembershipRepository: BusinessMembershipRepository) {}

  execute(command: AddMemberCommand): Promise<BusinessMembership> {
    return this.businessMembershipRepository.add(command.businessId, command.userId, command.role);
  }
}
