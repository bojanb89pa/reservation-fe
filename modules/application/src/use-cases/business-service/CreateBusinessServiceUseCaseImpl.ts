import type {
  BusinessServiceRepository,
  CreateBusinessServiceUseCase,
  CreateBusinessServiceCommand,
  BusinessService,
} from '@domain';

export class CreateBusinessServiceUseCaseImpl implements CreateBusinessServiceUseCase {
  constructor(private readonly businessServiceRepository: BusinessServiceRepository) {}

  execute(businessId: string, command: CreateBusinessServiceCommand): Promise<BusinessService> {
    return this.businessServiceRepository.create(businessId, command);
  }
}
