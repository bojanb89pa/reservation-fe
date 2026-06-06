import type {
  BusinessLocationService,
  AddServiceToLocationCommand,
} from '../entities/BusinessLocationService';

export interface BusinessLocationServiceRepository {
  add(
    businessId: string,
    locationId: string,
    command: AddServiceToLocationCommand,
  ): Promise<BusinessLocationService>;
  list(businessId: string, locationId: string): Promise<BusinessLocationService[]>;
  remove(businessId: string, locationId: string, serviceId: string): Promise<void>;
}
