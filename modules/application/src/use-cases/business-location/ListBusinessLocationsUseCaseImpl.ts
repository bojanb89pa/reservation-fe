import type {
  BusinessLocationRepository,
  ListBusinessLocationsUseCase,
  BusinessLocation,
} from '@domain';

export class ListBusinessLocationsUseCaseImpl implements ListBusinessLocationsUseCase {
  constructor(private readonly businessLocationRepository: BusinessLocationRepository) {}

  execute(businessId: string): Promise<BusinessLocation[]> {
    return this.businessLocationRepository.list(businessId);
  }
}
