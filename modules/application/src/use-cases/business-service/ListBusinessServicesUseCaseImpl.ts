import type {
  BusinessServiceRepository,
  ListBusinessServicesUseCase,
  BusinessService,
} from '@domain';

export class ListBusinessServicesUseCaseImpl implements ListBusinessServicesUseCase {
  constructor(private readonly businessServiceRepository: BusinessServiceRepository) {}

  execute(businessId: string): Promise<BusinessService[]> {
    return this.businessServiceRepository.list(businessId);
  }
}
