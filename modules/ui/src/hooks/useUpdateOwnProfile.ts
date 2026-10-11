import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateOwnProfileCommand, User } from '@domain';
import { updateOwnProfileUseCase } from '../app/container';

/**
 * Patches the signed-in user's name and writes the returned `User` into every
 * cached user lookup, so the page shows the new name without a refetch.
 */
// WARNING: the auth store holds only the token session (no user fields), so there is nothing to update there — verify before merging
export function useUpdateOwnProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: UpdateOwnProfileCommand) => updateOwnProfileUseCase.execute(command),
    onSuccess: (updated: User) => {
      queryClient.setQueriesData<User[]>({ queryKey: ['users', 'batch'] }, (cached) =>
        cached?.map((u) => (u.id === updated.id ? updated : u)),
      );
      return queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
