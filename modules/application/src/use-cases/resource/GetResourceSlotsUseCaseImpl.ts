import type {
  ResourceSlotRepository,
  GetResourceSlotsUseCase,
  ResourceSlot,
} from '@domain';

export class GetResourceSlotsUseCaseImpl implements GetResourceSlotsUseCase {
  constructor(private readonly slotRepository: ResourceSlotRepository) {}

  execute(resourceId: string, serviceId: string, from: string, to: string): Promise<ResourceSlot[]> {
    return this.slotRepository.getSlots(resourceId, serviceId, from, to);
  }
}
