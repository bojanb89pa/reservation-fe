import type { AvailabilityBlock } from '../entities/AvailabilityBlock';

export interface AvailabilityBlockRepository {
  getAvailabilityBlocks(
    resourceId: string,
    serviceId: string,
    from: string,
    to: string,
  ): Promise<AvailabilityBlock[]>;
}
