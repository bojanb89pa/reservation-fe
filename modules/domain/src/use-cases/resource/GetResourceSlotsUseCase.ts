import type { ResourceSlot } from '../../entities/ResourceSlot';

export interface GetResourceSlotsUseCase {
  execute(resourceId: string, serviceId: string, from: string, to: string): Promise<ResourceSlot[]>;
}
