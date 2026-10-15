import type {
  BusinessContactInfoRepository,
  RemoveContactInfoUseCase,
  BusinessContactInfo,
  RemoveContactInfoCommand,
} from '@fe/domain';

export class RemoveContactInfoUseCaseImpl implements RemoveContactInfoUseCase {
  constructor(private readonly businessContactInfoRepository: BusinessContactInfoRepository) {}

  execute(command: RemoveContactInfoCommand): Promise<BusinessContactInfo> {
    return this.businessContactInfoRepository.remove(command.businessId, command.contactInfoId);
  }
}
