import type {
  BusinessServiceRepository,
  UpdateBusinessServiceUseCase,
  UpdateBusinessServiceCommand,
  BusinessService,
} from '@fe/domain';

export class UpdateBusinessServiceUseCaseImpl implements UpdateBusinessServiceUseCase {
  constructor(private readonly businessServiceRepository: BusinessServiceRepository) {}

  execute(
    businessId: string,
    serviceId: string,
    command: UpdateBusinessServiceCommand,
  ): Promise<BusinessService> {
    return this.businessServiceRepository.update(businessId, serviceId, command);
  }
}
