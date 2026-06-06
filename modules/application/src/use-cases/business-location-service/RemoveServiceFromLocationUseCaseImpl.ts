import type { BusinessLocationServiceRepository, RemoveServiceFromLocationUseCase } from '@domain';

export class RemoveServiceFromLocationUseCaseImpl implements RemoveServiceFromLocationUseCase {
  constructor(
    private readonly businessLocationServiceRepository: BusinessLocationServiceRepository,
  ) {}

  execute(businessId: string, locationId: string, serviceId: string): Promise<void> {
    return this.businessLocationServiceRepository.remove(businessId, locationId, serviceId);
  }
}
