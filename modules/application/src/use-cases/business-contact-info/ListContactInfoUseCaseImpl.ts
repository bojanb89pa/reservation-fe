import type {
  BusinessContactInfoRepository,
  ListContactInfoUseCase,
  BusinessContactInfo,
} from '@domain';

export class ListContactInfoUseCaseImpl implements ListContactInfoUseCase {
  constructor(private readonly businessContactInfoRepository: BusinessContactInfoRepository) {}

  execute(businessId: string): Promise<BusinessContactInfo[]> {
    return this.businessContactInfoRepository.list(businessId);
  }
}
