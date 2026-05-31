import type { BusinessLocation } from '../../entities/BusinessLocation';

export interface ListBusinessLocationsUseCase {
  execute(businessId: string): Promise<BusinessLocation[]>;
}
