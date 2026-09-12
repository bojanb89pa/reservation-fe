import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setProfilePictureUseCase, deleteProfilePictureUseCase } from '../app/container';
import { useCurrentUserId } from './useCurrentRoles';
import { useUsersByIds } from './useUsersByIds';

/** The signed-in user's own profile, read through the same batch lookup as everyone else's. */
export function useCurrentUser() {
  const userId = useCurrentUserId();
  const { data, ...rest } = useUsersByIds(userId ? [userId] : []);
  return { user: data?.[0] ?? null, ...rest };
}

export function useSetProfilePicture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uploadId: string) => setProfilePictureUseCase.execute({ uploadId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteProfilePicture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteProfilePictureUseCase.execute(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
