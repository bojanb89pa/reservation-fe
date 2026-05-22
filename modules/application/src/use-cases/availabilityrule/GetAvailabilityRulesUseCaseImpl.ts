import type {
  ResourceAvailabilityRuleRepository,
  GetAvailabilityRulesUseCase,
  ResourceAvailabilityRule,
} from '@domain';

export class GetAvailabilityRulesUseCaseImpl implements GetAvailabilityRulesUseCase {
  constructor(private readonly ruleRepository: ResourceAvailabilityRuleRepository) {}

  execute(resourceId: string): Promise<ResourceAvailabilityRule[]> {
    return this.ruleRepository.getAllByResource(resourceId);
  }
}
