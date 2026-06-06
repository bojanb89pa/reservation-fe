import type {
  BusinessLocationResource,
  AddResourceToLocationCommand,
} from '../entities/BusinessLocationResource';

export interface BusinessLocationResourceRepository {
  add(
    businessId: string,
    locationId: string,
    command: AddResourceToLocationCommand,
  ): Promise<BusinessLocationResource>;
  list(businessId: string, locationId: string): Promise<BusinessLocationResource[]>;
  remove(businessId: string, locationId: string, resourceId: string): Promise<void>;
}
