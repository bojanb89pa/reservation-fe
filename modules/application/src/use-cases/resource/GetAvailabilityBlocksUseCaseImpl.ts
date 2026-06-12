import type {
  AvailabilityBlockRepository,
  GetAvailabilityBlocksUseCase,
  AvailabilityBlock,
} from '@domain';

export class GetAvailabilityBlocksUseCaseImpl implements GetAvailabilityBlocksUseCase {
  constructor(private readonly blockRepository: AvailabilityBlockRepository) {}

  execute(
    resourceId: string,
    serviceId: string,
    from: string,
    to: string,
  ): Promise<AvailabilityBlock[]> {
    return this.blockRepository.getAvailabilityBlocks(resourceId, serviceId, from, to);
  }
}
