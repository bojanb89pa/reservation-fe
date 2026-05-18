import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAvailabilityRulesUseCase,
  createAvailabilityRuleUseCase,
  deleteAvailabilityRuleUseCase,
} from '../app/container';
import type { CreateAvailabilityRuleCommand } from '@domain';

export const ruleKeys = {
  byResource: (resourceId: string) => ['availability-rules', resourceId] as const,
};

export function useAvailabilityRules(resourceId: string) {
  return useQuery({
    queryKey: ruleKeys.byResource(resourceId),
    queryFn: () => getAvailabilityRulesUseCase.execute(resourceId),
    enabled: !!resourceId,
  });
}

export function useCreateAvailabilityRule(resourceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: CreateAvailabilityRuleCommand) =>
      createAvailabilityRuleUseCase.execute(resourceId, command),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ruleKeys.byResource(resourceId) }),
  });
}

export function useDeleteAvailabilityRule(resourceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => deleteAvailabilityRuleUseCase.execute(resourceId, ruleId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ruleKeys.byResource(resourceId) }),
  });
}
