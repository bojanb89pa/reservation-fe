import type { BusinessService } from './BusinessService';

export interface BusinessLocationService {
  locationId: string;
  serviceId: string;
  service: BusinessService | null;
}

export interface AddServiceToLocationCommand {
  serviceId: string;
}
