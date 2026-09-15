import { useQuery } from '@tanstack/react-query';
import { searchNearbyBusinessesUseCase } from '../app/container';

export const nearbyBusinessKeys = {
  search: (
    latitude: number,
    longitude: number,
    categoryId: string | undefined,
    page: number,
    size: number,
  ) => ['businesses', 'nearby', latitude, longitude, categoryId ?? '', page, size] as const,
};

export function useNearbyBusinesses(
  latitude: number | null,
  longitude: number | null,
  categoryId: string | undefined,
  page = 0,
  size = 12,
) {
  return useQuery({
    queryKey:
      latitude !== null && longitude !== null
        ? nearbyBusinessKeys.search(latitude, longitude, categoryId, page, size)
        : (['businesses', 'nearby', 'disabled'] as const),
    queryFn: () =>
      searchNearbyBusinessesUseCase.execute(
        { latitude: latitude!, longitude: longitude!, categoryId },
        { page, size },
      ),
    enabled: latitude !== null && longitude !== null,
  });
}
