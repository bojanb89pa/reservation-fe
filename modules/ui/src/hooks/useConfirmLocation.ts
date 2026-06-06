import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmLocationUseCase } from '../app/container';

const locationKeys = {
  byBusiness: (businessId: string) => ['businesses', businessId, 'locations'] as const,
};

export function useConfirmLocation(businessId: string, locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => confirmLocationUseCase.execute(businessId, locationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: locationKeys.byBusiness(businessId) }),
  });
}
