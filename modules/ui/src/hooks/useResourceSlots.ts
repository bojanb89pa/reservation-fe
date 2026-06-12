import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getResourceSlotsUseCase } from '../app/container';

export const slotKeys = {
  byRange: (
    resourceId: string,
    serviceId: string,
    from: string,
    to: string,
    duration?: number,
  ) => ['resource-slots', resourceId, serviceId, from, to, duration ?? null] as const,
};

export function useResourceSlots(
  resourceId: string,
  serviceId: string,
  from: string,
  to: string,
  enabled = true,
  duration?: number,
) {
  return useQuery({
    queryKey: slotKeys.byRange(resourceId, serviceId, from, to, duration),
    queryFn: () => getResourceSlotsUseCase.execute(resourceId, serviceId, from, to, duration),
    enabled: enabled && !!resourceId && !!serviceId && !!from && !!to,
  });
}

export function useInvalidateResourceSlots() {
  const queryClient = useQueryClient();
  return (resourceId: string) =>
    queryClient.invalidateQueries({ queryKey: ['resource-slots', resourceId] });
}
