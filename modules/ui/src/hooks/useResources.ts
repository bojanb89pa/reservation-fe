import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllResourcesUseCase, createResourceUseCase } from '../app/container';
import type { CreateResourceCommand } from '@domain';

export const resourceKeys = {
  all: ['resources'] as const,
  byBusiness: (businessId: string) => ['resources', 'business', businessId] as const,
};

export function useResources(businessId: string, page = 0, size = 100) {
  return useQuery({
    queryKey: resourceKeys.byBusiness(businessId),
    queryFn: () => getAllResourcesUseCase.execute(businessId, { page, size }),
    enabled: !!businessId,
  });
}

export function useCreateResource(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: CreateResourceCommand) =>
      createResourceUseCase.execute(businessId, command),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: resourceKeys.byBusiness(businessId) }),
  });
}
