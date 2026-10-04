import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchUsersUseCase } from '../app/container';

// WARNING: assumed suggestion limit — verify against UX expectations before merging
const SUGGESTION_LIMIT = 8;

// A 403 (BUSINESS_MEMBERSHIP_REQUIRED) means the caller may not search; it is treated as
// an empty result, silently. The error is matched structurally because ui cannot import
// the infrastructure ApiError class.
function isForbidden(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: unknown }).status === 403
  );
}

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
    queryFn: async () => {
      try {
        return await searchUsersUseCase.execute({ query: debouncedQuery, limit: SUGGESTION_LIMIT });
      } catch (error) {
        if (isForbidden(error)) return [];
        throw error;
      }
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });
}
