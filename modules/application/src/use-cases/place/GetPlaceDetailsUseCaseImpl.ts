import type { GetPlaceDetailsUseCase, PlaceDetails, PlaceRepository } from '@fe/domain';

export class GetPlaceDetailsUseCaseImpl implements GetPlaceDetailsUseCase {
  constructor(private readonly placeRepository: PlaceRepository) {}

  execute(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
    return this.placeRepository.getDetails(placeId, sessionToken);
  }
}
