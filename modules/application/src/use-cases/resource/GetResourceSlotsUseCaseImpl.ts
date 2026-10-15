import type {
  ResourceSlotRepository,
  GetResourceSlotsUseCase,
  ResourceSlot,
} from '@fe/domain';

export class GetResourceSlotsUseCaseImpl implements GetResourceSlotsUseCase {
  constructor(private readonly slotRepository: ResourceSlotRepository) {}

  execute(
    resourceId: string,
    serviceId: string,
    from: string,
    to: string,
    duration?: number,
  ): Promise<ResourceSlot[]> {
    return this.slotRepository.getSlots(resourceId, serviceId, from, to, duration);
  }
}
