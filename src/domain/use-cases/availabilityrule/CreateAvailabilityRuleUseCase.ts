import type {
  ResourceAvailabilityRule,
  CreateAvailabilityRuleCommand,
} from '../../entities/ResourceAvailabilityRule';

export interface CreateAvailabilityRuleUseCase {
  execute(
    resourceId: string,
    command: CreateAvailabilityRuleCommand,
  ): Promise<ResourceAvailabilityRule>;
}
