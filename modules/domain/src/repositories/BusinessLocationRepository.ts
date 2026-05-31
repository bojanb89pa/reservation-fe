import type { BusinessLocation, CreateBusinessLocationCommand } from '../entities/BusinessLocation';

export interface BusinessLocationRepository {
  create(businessId: string, command: CreateBusinessLocationCommand): Promise<BusinessLocation>;
  list(businessId: string): Promise<BusinessLocation[]>;
  getById(businessId: string, locationId: string): Promise<BusinessLocation>;
}
