import type { AvailabilityBlock } from '../../entities/AvailabilityBlock';

export interface GetAvailabilityBlocksUseCase {
  execute(
    resourceId: string,
    serviceId: string,
    from: string,
    to: string,
  ): Promise<AvailabilityBlock[]>;
}
