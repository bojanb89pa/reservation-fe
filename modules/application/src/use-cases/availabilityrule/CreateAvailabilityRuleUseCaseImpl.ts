import type {
  ResourceAvailabilityRuleRepository,
  CreateAvailabilityRuleUseCase,
  ResourceAvailabilityRule,
  CreateAvailabilityRuleCommand,
} from '@domain';

export class CreateAvailabilityRuleUseCaseImpl implements CreateAvailabilityRuleUseCase {
  constructor(
    private readonly ruleRepository: ResourceAvailabilityRuleRepository,
  ) {}

  execute(
    resourceId: string,
    command: CreateAvailabilityRuleCommand,
  ): Promise<ResourceAvailabilityRule> {
    return this.ruleRepository.create(resourceId, command);
  }
}
