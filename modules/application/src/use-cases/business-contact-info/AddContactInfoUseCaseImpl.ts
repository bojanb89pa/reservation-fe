import type {
  BusinessContactInfoRepository,
  AddContactInfoUseCase,
  BusinessContactInfo,
  AddContactInfoCommand,
} from '@domain';

export class AddContactInfoUseCaseImpl implements AddContactInfoUseCase {
  constructor(private readonly businessContactInfoRepository: BusinessContactInfoRepository) {}

  execute(command: AddContactInfoCommand): Promise<BusinessContactInfo> {
    return this.businessContactInfoRepository.add(
      command.businessId,
      command.type,
      command.value,
      command.label,
    );
  }
}
