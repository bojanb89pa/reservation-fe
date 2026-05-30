import type {
  BusinessCategoryRepository,
  ListBusinessCategoriesUseCase,
  BusinessCategory,
} from '@domain';

export class ListBusinessCategoriesUseCaseImpl implements ListBusinessCategoriesUseCase {
  constructor(private readonly businessCategoryRepository: BusinessCategoryRepository) {}

  execute(locale: string): Promise<BusinessCategory[]> {
    return this.businessCategoryRepository.list(locale);
  }
}
