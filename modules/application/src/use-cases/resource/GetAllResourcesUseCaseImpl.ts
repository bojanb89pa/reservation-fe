import type { ResourceRepository, GetAllResourcesUseCase, Resource, PageRequest, PageResponse } from '@domain';

export class GetAllResourcesUseCaseImpl implements GetAllResourcesUseCase {
  constructor(private readonly resourceRepository: ResourceRepository) {}

  execute(businessId: string, pageRequest: PageRequest): Promise<PageResponse<Resource>> {
    return this.resourceRepository.getAllByBusiness(businessId, pageRequest);
  }
}
