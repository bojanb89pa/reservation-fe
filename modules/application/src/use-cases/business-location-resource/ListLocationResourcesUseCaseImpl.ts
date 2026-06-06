import type {
  BusinessLocationResourceRepository,
  ListLocationResourcesUseCase,
  BusinessLocationResource,
} from '@domain';

export class ListLocationResourcesUseCaseImpl implements ListLocationResourcesUseCase {
  constructor(
    private readonly businessLocationResourceRepository: BusinessLocationResourceRepository,
  ) {}

  execute(businessId: string, locationId: string): Promise<BusinessLocationResource[]> {
    return this.businessLocationResourceRepository.list(businessId, locationId);
  }
}
