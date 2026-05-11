import type { BusinessRepository } from '@domain/repositories/BusinessRepository';
import type { GetBusinessUseCase } from '@domain/use-cases/business/GetBusinessUseCase';
import type { Business } from '@domain/entities/Business';

export class GetBusinessUseCaseImpl implements GetBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string): Promise<Business> {
    return this.businessRepository.getById(id);
  }
}
