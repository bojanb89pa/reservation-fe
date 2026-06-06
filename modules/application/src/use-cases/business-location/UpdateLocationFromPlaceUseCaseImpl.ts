import type {
  BusinessLocation,
  BusinessLocationRepository,
  UpdateBusinessLocationFromPlaceCommand,
  UpdateLocationFromPlaceUseCase,
} from '@domain';

export class UpdateLocationFromPlaceUseCaseImpl implements UpdateLocationFromPlaceUseCase {
  constructor(private readonly businessLocationRepository: BusinessLocationRepository) {}

  execute(
    businessId: string,
    locationId: string,
    command: UpdateBusinessLocationFromPlaceCommand,
  ): Promise<BusinessLocation> {
    return this.businessLocationRepository.updateFromPlace(businessId, locationId, command);
  }
}
