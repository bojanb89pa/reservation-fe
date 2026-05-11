import type { BusinessRepository } from '@domain/repositories/BusinessRepository';
import type { CreateBusinessUseCase } from '@domain/use-cases/business/CreateBusinessUseCase';
import type { Business } from '@domain/entities/Business';

export class CreateBusinessUseCaseImpl implements CreateBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(command: Pick<Business, 'name'>): Promise<Business> {
    return this.businessRepository.create(command);
  }
}
