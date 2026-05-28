import type { BusinessService } from '../../entities/BusinessService';

export interface GetBusinessServiceUseCase {
  execute(businessId: string, serviceId: string): Promise<BusinessService>;
}
