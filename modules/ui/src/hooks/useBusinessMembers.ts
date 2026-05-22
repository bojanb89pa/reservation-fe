import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BusinessMemberRole } from '@domain';
import {
  listBusinessMembersUseCase,
  addBusinessMemberUseCase,
  removeBusinessMemberUseCase,
} from '../app/container';

export const memberKeys = {
  byRole: (businessId: string, role: BusinessMemberRole) =>
    ['businesses', businessId, 'members', role] as const,
};

export function useBusinessMembers(businessId: string, role: BusinessMemberRole) {
  return useQuery({
    queryKey: memberKeys.byRole(businessId, role),
    queryFn: () => listBusinessMembersUseCase.execute(businessId, role),
    enabled: !!businessId,
  });
}

export function useAddBusinessMember(businessId: string, role: BusinessMemberRole) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => addBusinessMemberUseCase.execute({ businessId, userId, role }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: memberKeys.byRole(businessId, role) }),
  });
}

export function useRemoveBusinessMember(businessId: string, role: BusinessMemberRole) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      removeBusinessMemberUseCase.execute({ businessId, userId, role }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: memberKeys.byRole(businessId, role) }),
  });
}
