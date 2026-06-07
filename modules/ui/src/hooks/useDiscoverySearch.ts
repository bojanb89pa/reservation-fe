import { useQuery } from '@tanstack/react-query';
import type { DiscoverySearchQuery } from '@domain';
import { discoverySearchUseCase } from '../app/container';

export const discoverySearchKeys = {
  search: (q: string, city: string, page: number, size: number) =>
    ['discovery', 'search', q, city, page, size] as const,
};

export function useDiscoverySearch(query: DiscoverySearchQuery, page = 0, size = 20) {
  return useQuery({
    queryKey: discoverySearchKeys.search(query.q, query.city ?? '', page, size),
    queryFn: () => discoverySearchUseCase.execute(query, { page, size }),
    enabled: query.q.trim().length > 0,
  });
}
