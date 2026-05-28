import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateBusinessServiceCommand, UpdateBusinessServiceCommand } from '@domain';
import {
  listBusinessServicesUseCase,
  createBusinessServiceUseCase,
  updateBusinessServiceUseCase,
  deleteBusinessServiceUseCase,
} from '../app/container';

const serviceKeys = {
  byBusiness: (businessId: string) => ['businesses', businessId, 'services'] as const,
};

export function useBusinessServices(businessId: string) {
  return useQuery({
    queryKey: serviceKeys.byBusiness(businessId),
    queryFn: () => listBusinessServicesUseCase.execute(businessId),
    enabled: !!businessId,
  });
}

export function useCreateBusinessService(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: CreateBusinessServiceCommand) =>
      createBusinessServiceUseCase.execute(businessId, command),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: serviceKeys.byBusiness(businessId) }),
  });
}

export function useUpdateBusinessService(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { serviceId: string; command: UpdateBusinessServiceCommand }) =>
      updateBusinessServiceUseCase.execute(businessId, args.serviceId, args.command),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: serviceKeys.byBusiness(businessId) }),
  });
}

export function useDeleteBusinessService(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => deleteBusinessServiceUseCase.execute(businessId, serviceId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: serviceKeys.byBusiness(businessId) }),
  });
}
