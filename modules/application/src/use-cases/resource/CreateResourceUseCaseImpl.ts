import type { ResourceRepository, CreateResourceUseCase, Resource, CreateResourceCommand } from '@domain';

export class CreateResourceUseCaseImpl implements CreateResourceUseCase {
  constructor(private readonly resourceRepository: ResourceRepository) {}

  execute(businessId: string, command: CreateResourceCommand): Promise<Resource> {
    return this.resourceRepository.create(businessId, command);
  }
}
