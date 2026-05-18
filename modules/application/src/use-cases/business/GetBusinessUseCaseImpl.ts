import type { BusinessRepository, GetBusinessUseCase, Business } from '@domain';

export class GetBusinessUseCaseImpl implements GetBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string): Promise<Business> {
    return this.businessRepository.getById(id);
  }
}
