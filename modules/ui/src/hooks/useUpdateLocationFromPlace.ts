import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateBusinessLocationFromPlaceCommand } from '@domain';
import { updateLocationFromPlaceUseCase } from '../app/container';

const locationKeys = {
  byBusiness: (businessId: string) => ['businesses', businessId, 'locations'] as const,
};

export function useUpdateLocationFromPlace(businessId: string, locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: UpdateBusinessLocationFromPlaceCommand) =>
      updateLocationFromPlaceUseCase.execute(businessId, locationId, command),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: locationKeys.byBusiness(businessId) }),
  });
}
