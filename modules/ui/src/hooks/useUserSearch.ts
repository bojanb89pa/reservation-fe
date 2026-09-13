import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchUsersUseCase } from '../app/container';

// WARNING: assumed suggestion limit — verify against UX expectations before merging
const SUGGESTION_LIMIT = 8;

export function useUserSearch(query: string) {
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
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: () => searchUsersUseCase.execute({ query: debouncedQuery, limit: SUGGESTION_LIMIT }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });
}
