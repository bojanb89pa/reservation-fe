import type { BusinessLocation } from '../../entities/BusinessLocation';

export interface GetBusinessLocationUseCase {
  execute(businessId: string, locationId: string): Promise<BusinessLocation>;
}
