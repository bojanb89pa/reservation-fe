import type {
  BusinessLocation,
  UpdateBusinessLocationFromPlaceCommand,
} from '../../entities/BusinessLocation';

export interface UpdateLocationFromPlaceUseCase {
  execute(
    businessId: string,
    locationId: string,
    command: UpdateBusinessLocationFromPlaceCommand,
  ): Promise<BusinessLocation>;
}
