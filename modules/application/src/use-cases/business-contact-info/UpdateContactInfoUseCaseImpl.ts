import type {
  BusinessContactInfoRepository,
  UpdateContactInfoUseCase,
  BusinessContactInfo,
  UpdateContactInfoCommand,
} from '@domain';

export class UpdateContactInfoUseCaseImpl implements UpdateContactInfoUseCase {
  constructor(private readonly businessContactInfoRepository: BusinessContactInfoRepository) {}

  execute(command: UpdateContactInfoCommand): Promise<BusinessContactInfo> {
    return this.businessContactInfoRepository.update(
      command.businessId,
      command.contactInfoId,
      command.type,
      command.value,
      command.label,
    );
  }
}
