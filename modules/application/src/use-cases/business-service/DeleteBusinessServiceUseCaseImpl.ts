import type {
  BusinessServiceRepository,
  DeleteBusinessServiceUseCase,
  BusinessService,
} from '@domain';

export class DeleteBusinessServiceUseCaseImpl implements DeleteBusinessServiceUseCase {
  constructor(private readonly businessServiceRepository: BusinessServiceRepository) {}

  execute(businessId: string, serviceId: string): Promise<BusinessService> {
    return this.businessServiceRepository.delete(businessId, serviceId);
  }
}
