import { useQuery } from '@tanstack/react-query';
import { getPlaceDetailsUseCase } from '../app/container';

export function usePlaceDetails(placeId: string | null, sessionToken?: string) {
  return useQuery({
    queryKey: ['places', 'details', placeId, sessionToken],
    queryFn: () => getPlaceDetailsUseCase.execute(placeId!, sessionToken),
    enabled: !!placeId,
    staleTime: 60_000,
  });
}
