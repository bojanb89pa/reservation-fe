import type { ResourceAvailabilityRuleRepository } from '@domain/repositories/ResourceAvailabilityRuleRepository';
import type { CreateAvailabilityRuleUseCase } from '@domain/use-cases/availabilityrule/CreateAvailabilityRuleUseCase';
import type {
  ResourceAvailabilityRule,
  CreateAvailabilityRuleCommand,
} from '@domain/entities/ResourceAvailabilityRule';

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
