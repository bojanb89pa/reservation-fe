import type { BusinessService, UpdateBusinessServiceCommand } from '../../entities/BusinessService';

export interface UpdateBusinessServiceUseCase {
  execute(
    businessId: string,
    serviceId: string,
    command: UpdateBusinessServiceCommand,
  ): Promise<BusinessService>;
}
