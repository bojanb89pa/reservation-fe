import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateBusinessLocationCommand } from '@domain';
import { listBusinessLocationsUseCase, createBusinessLocationUseCase } from '../app/container';

const locationKeys = {
  byBusiness: (businessId: string) => ['businesses', businessId, 'locations'] as const,
};

export function useBusinessLocations(businessId: string) {
  return useQuery({
    queryKey: locationKeys.byBusiness(businessId),
    queryFn: () => listBusinessLocationsUseCase.execute(businessId),
    enabled: !!businessId,
  });
}

export function useCreateBusinessLocation(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: CreateBusinessLocationCommand) =>
      createBusinessLocationUseCase.execute(businessId, command),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: locationKeys.byBusiness(businessId) }),
  });
}
