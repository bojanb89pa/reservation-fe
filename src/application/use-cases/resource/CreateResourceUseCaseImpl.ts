import type { ResourceRepository } from '@domain/repositories/ResourceRepository';
import type { CreateResourceUseCase } from '@domain/use-cases/resource/CreateResourceUseCase';
import type { Resource, CreateResourceCommand } from '@domain/entities/Resource';

export class CreateResourceUseCaseImpl implements CreateResourceUseCase {
  constructor(private readonly resourceRepository: ResourceRepository) {}

  execute(businessId: string, command: CreateResourceCommand): Promise<Resource> {
    return this.resourceRepository.create(businessId, command);
  }
}
