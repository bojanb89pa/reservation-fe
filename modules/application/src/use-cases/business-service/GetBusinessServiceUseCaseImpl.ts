import type {
  BusinessServiceRepository,
  GetBusinessServiceUseCase,
  BusinessService,
} from '@domain';

export class GetBusinessServiceUseCaseImpl implements GetBusinessServiceUseCase {
  constructor(private readonly businessServiceRepository: BusinessServiceRepository) {}

  execute(businessId: string, serviceId: string): Promise<BusinessService> {
    return this.businessServiceRepository.getById(businessId, serviceId);
  }
}
