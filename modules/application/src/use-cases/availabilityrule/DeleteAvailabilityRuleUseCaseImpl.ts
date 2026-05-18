import type { ResourceAvailabilityRuleRepository, DeleteAvailabilityRuleUseCase } from '@domain';

export class DeleteAvailabilityRuleUseCaseImpl implements DeleteAvailabilityRuleUseCase {
  constructor(
    private readonly ruleRepository: ResourceAvailabilityRuleRepository,
  ) {}

  execute(resourceId: string, ruleId: string): Promise<void> {
    return this.ruleRepository.delete(resourceId, ruleId);
  }
}
