import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Business } from '@domain';
import { updateOverlappingPendingSettingUseCase } from '../app/container';
import { businessKeys } from './useBusinesses';

export function useUpdateOverlappingPendingSetting(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allowOverlappingPendingReservations: boolean) =>
      updateOverlappingPendingSettingUseCase.execute(
        businessId,
        allowOverlappingPendingReservations,
      ),
    onSuccess: (updated: Business) => {
      queryClient.setQueryData(businessKeys.detail(businessId), updated);
      queryClient.invalidateQueries({ queryKey: businessKeys.all });
    },
  });
}
