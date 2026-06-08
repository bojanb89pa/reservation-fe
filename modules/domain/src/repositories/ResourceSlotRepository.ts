import type { ResourceSlot } from '../entities/ResourceSlot';

export interface ResourceSlotRepository {
  getSlots(
    resourceId: string,
    serviceId: string,
    from: string,
    to: string,
  ): Promise<ResourceSlot[]>;
}
