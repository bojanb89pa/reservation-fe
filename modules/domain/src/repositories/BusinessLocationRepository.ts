import type {
  BusinessLocation,
  CreateBusinessLocationCommand,
  UpdateBusinessLocationFromPlaceCommand,
} from '../entities/BusinessLocation';

export interface BusinessLocationRepository {
  create(businessId: string, command: CreateBusinessLocationCommand): Promise<BusinessLocation>;
  list(businessId: string): Promise<BusinessLocation[]>;
  getById(businessId: string, locationId: string): Promise<BusinessLocation>;
  updateFromPlace(
    businessId: string,
    locationId: string,
    command: UpdateBusinessLocationFromPlaceCommand,
  ): Promise<BusinessLocation>;
  confirm(businessId: string, locationId: string): Promise<BusinessLocation>;
}
