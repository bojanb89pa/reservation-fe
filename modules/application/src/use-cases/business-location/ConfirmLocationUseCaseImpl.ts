import type { BusinessLocation, BusinessLocationRepository, ConfirmLocationUseCase } from '@domain';

export class ConfirmLocationUseCaseImpl implements ConfirmLocationUseCase {
  constructor(private readonly businessLocationRepository: BusinessLocationRepository) {}

  execute(businessId: string, locationId: string): Promise<BusinessLocation> {
    return this.businessLocationRepository.confirm(businessId, locationId);
  }
}
