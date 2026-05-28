import type { BusinessService } from '../../entities/BusinessService';

export interface DeleteBusinessServiceUseCase {
  execute(businessId: string, serviceId: string): Promise<BusinessService>;
}
