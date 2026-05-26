import type {
  BusinessCategoryRepository,
  ListBusinessCategoriesUseCase,
  BusinessCategory,
} from '@domain';

export class ListBusinessCategoriesUseCaseImpl implements ListBusinessCategoriesUseCase {
  constructor(private readonly businessCategoryRepository: BusinessCategoryRepository) {}

  execute(): Promise<BusinessCategory[]> {
    return this.businessCategoryRepository.list();
  }
}
