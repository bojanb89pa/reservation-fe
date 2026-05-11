import type { ResourceRepository } from '@domain/repositories/ResourceRepository';
import type { GetAllResourcesUseCase } from '@domain/use-cases/resource/GetAllResourcesUseCase';
import type { Resource } from '@domain/entities/Resource';
import type { PageRequest, PageResponse } from '@domain/types/Page';

export class GetAllResourcesUseCaseImpl implements GetAllResourcesUseCase {
  constructor(private readonly resourceRepository: ResourceRepository) {}

  execute(businessId: string, pageRequest: PageRequest): Promise<PageResponse<Resource>> {
    return this.resourceRepository.getAllByBusiness(businessId, pageRequest);
  }
}
