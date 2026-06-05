import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AddResourceToLocationCommand } from '@domain';
import {
  listLocationResourcesUseCase,
  addResourceToLocationUseCase,
  removeResourceFromLocationUseCase,
} from '../app/container';

const locationResourceKeys = {
  byLocation: (businessId: string, locationId: string) =>
    ['businesses', businessId, 'locations', locationId, 'resources'] as const,
};

export function useLocationResources(businessId: string, locationId: string) {
  return useQuery({
    queryKey: locationResourceKeys.byLocation(businessId, locationId),
    queryFn: () => listLocationResourcesUseCase.execute(businessId, locationId),
    enabled: !!businessId && !!locationId,
  });
}

export function useAddLocationResource(businessId: string, locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: AddResourceToLocationCommand) =>
      addResourceToLocationUseCase.execute(businessId, locationId, command),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: locationResourceKeys.byLocation(businessId, locationId),
      }),
  });
}

export function useRemoveLocationResource(businessId: string, locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) =>
      removeResourceFromLocationUseCase.execute(businessId, locationId, resourceId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: locationResourceKeys.byLocation(businessId, locationId),
      }),
  });
}
