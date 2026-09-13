import type {
  BusinessMembershipRepository,
  NotifyBusinessMembershipUseCase,
  NotifyBusinessMembershipCommand,
} from '@domain';

export class NotifyBusinessMembershipUseCaseImpl implements NotifyBusinessMembershipUseCase {
  constructor(private readonly businessMembershipRepository: BusinessMembershipRepository) {}

  execute(command: NotifyBusinessMembershipCommand): Promise<void> {
    return this.businessMembershipRepository.notifyMembership(command);
  }
}
