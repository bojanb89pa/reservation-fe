import type { BusinessService } from '../../entities/BusinessService';

export interface ListBusinessServicesUseCase {
  execute(businessId: string): Promise<BusinessService[]>;
}
