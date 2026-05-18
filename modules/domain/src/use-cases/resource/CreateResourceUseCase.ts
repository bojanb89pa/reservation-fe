import type { Resource, CreateResourceCommand } from '../../entities/Resource';

export interface CreateResourceUseCase {
  execute(businessId: string, command: CreateResourceCommand): Promise<Resource>;
}
