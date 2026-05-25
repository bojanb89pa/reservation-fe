import type { BusinessRepository, DeleteBusinessUseCase, Business } from '@domain';

export class DeleteBusinessUseCaseImpl implements DeleteBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string): Promise<Business> {
    return this.businessRepository.delete(id);
  }
}
