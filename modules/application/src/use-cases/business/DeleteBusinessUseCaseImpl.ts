import type { BusinessRepository, DeleteBusinessUseCase, Business } from '@fe/domain';

export class DeleteBusinessUseCaseImpl implements DeleteBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string): Promise<Business> {
    return this.businessRepository.delete(id);
  }
}
