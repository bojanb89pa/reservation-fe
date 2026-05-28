import type { BusinessService, CreateBusinessServiceCommand } from '../../entities/BusinessService';

export interface CreateBusinessServiceUseCase {
  execute(businessId: string, command: CreateBusinessServiceCommand): Promise<BusinessService>;
}
