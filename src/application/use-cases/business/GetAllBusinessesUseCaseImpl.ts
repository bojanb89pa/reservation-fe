import type { BusinessRepository } from '@domain/repositories/BusinessRepository';
import type { GetAllBusinessesUseCase } from '@domain/use-cases/business/GetAllBusinessesUseCase';
import type { Business } from '@domain/entities/Business';
import type { PageRequest, PageResponse } from '@domain/types/Page';

export class GetAllBusinessesUseCaseImpl implements GetAllBusinessesUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(pageRequest: PageRequest): Promise<PageResponse<Business>> {
    return this.businessRepository.getAll(pageRequest);
  }
}
