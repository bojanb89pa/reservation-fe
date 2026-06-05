import type { BusinessLocationService } from '../../entities/BusinessLocationService';

export interface ListLocationServicesUseCase {
  execute(businessId: string, locationId: string): Promise<BusinessLocationService[]>;
}
