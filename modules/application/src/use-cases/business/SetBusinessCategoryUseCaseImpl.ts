import type { BusinessRepository, SetBusinessCategoryUseCase, Business } from '@domain';

export class SetBusinessCategoryUseCaseImpl implements SetBusinessCategoryUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string, categoryId: string | null): Promise<Business> {
    return this.businessRepository.setCategory(id, { categoryId });
  }
}
