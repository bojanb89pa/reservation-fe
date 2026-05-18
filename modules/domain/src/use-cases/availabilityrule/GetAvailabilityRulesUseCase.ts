import type { ResourceAvailabilityRule } from '../../entities/ResourceAvailabilityRule';

export interface GetAvailabilityRulesUseCase {
  execute(resourceId: string): Promise<ResourceAvailabilityRule[]>;
}
