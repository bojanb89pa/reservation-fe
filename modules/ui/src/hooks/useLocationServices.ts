import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AddServiceToLocationCommand } from '@domain';
import {
  listLocationServicesUseCase,
  addServiceToLocationUseCase,
  removeServiceFromLocationUseCase,
} from '../app/container';

const locationServiceKeys = {
  byLocation: (businessId: string, locationId: string) =>
    ['businesses', businessId, 'locations', locationId, 'services'] as const,
};

export function useLocationServices(businessId: string, locationId: string) {
  return useQuery({
    queryKey: locationServiceKeys.byLocation(businessId, locationId),
    queryFn: () => listLocationServicesUseCase.execute(businessId, locationId),
    enabled: !!businessId && !!locationId,
  });
}

export function useAddLocationService(businessId: string, locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: AddServiceToLocationCommand) =>
      addServiceToLocationUseCase.execute(businessId, locationId, command),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: locationServiceKeys.byLocation(businessId, locationId),
      }),
  });
}

export function useRemoveLocationService(businessId: string, locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) =>
      removeServiceFromLocationUseCase.execute(businessId, locationId, serviceId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: locationServiceKeys.byLocation(businessId, locationId),
      }),
  });
}
