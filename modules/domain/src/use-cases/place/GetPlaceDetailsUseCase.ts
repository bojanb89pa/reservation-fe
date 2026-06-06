import type { PlaceDetails } from '../../entities/Place';

export interface GetPlaceDetailsUseCase {
  execute(placeId: string, sessionToken?: string): Promise<PlaceDetails>;
}
