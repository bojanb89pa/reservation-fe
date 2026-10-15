import type {
  BusinessMembershipRepository,
  RemoveBusinessMemberUseCase,
  RemoveMemberCommand,
} from '@fe/domain';

export class RemoveBusinessMemberUseCaseImpl implements RemoveBusinessMemberUseCase {
  constructor(private readonly businessMembershipRepository: BusinessMembershipRepository) {}

  execute(command: RemoveMemberCommand): Promise<void> {
    return this.businessMembershipRepository.remove(
      command.businessId,
      command.userId,
      command.role,
    );
  }
}
