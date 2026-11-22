import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Business } from '@fe/domain';
import {
  setCancellationDeadlineUseCase,
  removeCancellationDeadlineUseCase,
} from '../app/container';
import { businessKeys } from './useBusinesses';

function useBusinessCacheSync(businessId: string) {
  const queryClient = useQueryClient();
  return (updated: Business) => {
    queryClient.setQueryData(businessKeys.detail(businessId), updated);
    queryClient.invalidateQueries({ queryKey: businessKeys.all });
  };
}

export function useSetCancellationDeadline(businessId: string) {
  const sync = useBusinessCacheSync(businessId);
  return useMutation({
    mutationFn: (minNoticeMinutes: number) =>
      setCancellationDeadlineUseCase.execute(businessId, minNoticeMinutes),
    onSuccess: sync,
  });
}

export function useRemoveCancellationDeadline(businessId: string) {
  const sync = useBusinessCacheSync(businessId);
  return useMutation({
    mutationFn: () => removeCancellationDeadlineUseCase.execute(businessId),
    onSuccess: sync,
  });
}
