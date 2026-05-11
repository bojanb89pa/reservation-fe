import type { ResourceAvailabilityRuleRepository } from '@domain/repositories/ResourceAvailabilityRuleRepository';
import type { DeleteAvailabilityRuleUseCase } from '@domain/use-cases/availabilityrule/DeleteAvailabilityRuleUseCase';

export class DeleteAvailabilityRuleUseCaseImpl implements DeleteAvailabilityRuleUseCase {
  constructor(
    private readonly ruleRepository: ResourceAvailabilityRuleRepository,
  ) {}

  execute(resourceId: string, ruleId: string): Promise<void> {
    return this.ruleRepository.delete(resourceId, ruleId);
  }
}
