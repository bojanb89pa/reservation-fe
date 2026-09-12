import { useQuery } from '@tanstack/react-query';
import type { User } from '@domain';
import { getUsersByIdsUseCase } from '../app/container';

/**
 * One batch call over the unique ids on a list, instead of one request per row.
 * An id the backend leaves out of the response is a normal "unknown user" state,
 * not an error — callers fall back on a missing map entry.
 */
export function useUsersByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids)].sort();

  return useQuery({
    queryKey: ['users', 'batch', uniqueIds] as const,
    queryFn: () => getUsersByIdsUseCase.execute(uniqueIds),
    enabled: uniqueIds.length > 0,
  });
}

export function mapUsersById(users: User[]): Map<string, User> {
  return new Map(users.filter((u): u is User & { id: string } => u.id !== null).map((u) => [u.id, u]));
}
