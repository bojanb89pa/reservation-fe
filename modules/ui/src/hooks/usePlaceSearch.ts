import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchPlacesUseCase } from '../app/container';

export function usePlaceSearch(query: string, sessionToken: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['places', 'search', debouncedQuery, sessionToken],
    queryFn: () => searchPlacesUseCase.execute(debouncedQuery, sessionToken),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });
}
