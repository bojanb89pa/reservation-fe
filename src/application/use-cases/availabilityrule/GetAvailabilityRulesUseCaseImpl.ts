import type { ResourceAvailabilityRuleRepository } from '@domain/repositories/ResourceAvailabilityRuleRepository';
import type { GetAvailabilityRulesUseCase } from '@domain/use-cases/availabilityrule/GetAvailabilityRulesUseCase';
import type { ResourceAvailabilityRule } from '@domain/entities/ResourceAvailabilityRule';

export class GetAvailabilityRulesUseCaseImpl implements GetAvailabilityRulesUseCase {
  constructor(
    private readonly ruleRepository: ResourceAvailabilityRuleRepository,
  ) {}

  execute(resourceId: string): Promise<ResourceAvailabilityRule[]> {
    return this.ruleRepository.getAllByResource(resourceId);
  }
}
