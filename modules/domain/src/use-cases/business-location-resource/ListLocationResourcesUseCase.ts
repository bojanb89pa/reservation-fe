import type { BusinessLocationResource } from '../../entities/BusinessLocationResource';

export interface ListLocationResourcesUseCase {
  execute(businessId: string, locationId: string): Promise<BusinessLocationResource[]>;
}
