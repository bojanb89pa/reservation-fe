export interface DeleteAvailabilityRuleUseCase {
  execute(resourceId: string, ruleId: string): Promise<void>;
}
