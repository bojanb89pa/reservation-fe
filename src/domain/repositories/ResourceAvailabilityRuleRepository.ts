import type {
  ResourceAvailabilityRule,
  CreateAvailabilityRuleCommand,
} from '../entities/ResourceAvailabilityRule';

export interface ResourceAvailabilityRuleRepository {
  getAllByResource(resourceId: string): Promise<ResourceAvailabilityRule[]>;
  create(
    resourceId: string,
    command: CreateAvailabilityRuleCommand,
  ): Promise<ResourceAvailabilityRule>;
  delete(resourceId: string, ruleId: string): Promise<void>;
}
