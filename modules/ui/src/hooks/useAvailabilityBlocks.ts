import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAvailabilityBlocksUseCase } from '../app/container';

export const availabilityBlockKeys = {
  byRange: (resourceId: string, serviceId: string, from: string, to: string) =>
    ['availability-blocks', resourceId, serviceId, from, to] as const,
};

export function useAvailabilityBlocks(
  resourceId: string,
  serviceId: string,
  from: string,
  to: string,
  enabled = true,
) {
  return useQuery({
    queryKey: availabilityBlockKeys.byRange(resourceId, serviceId, from, to),
    queryFn: () => getAvailabilityBlocksUseCase.execute(resourceId, serviceId, from, to),
    enabled: enabled && !!resourceId && !!serviceId && !!from && !!to,
  });
}

export function useInvalidateAvailabilityBlocks() {
  const queryClient = useQueryClient();
  return (resourceId: string) =>
    queryClient.invalidateQueries({ queryKey: ['availability-blocks', resourceId] });
}
