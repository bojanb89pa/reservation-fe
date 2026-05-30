import type {
  LocalizedBusinessCategoryRepository,
  ListLocalizedBusinessCategoriesUseCase,
  LocalizedBusinessCategory,
} from '@domain';

export class ListLocalizedBusinessCategoriesUseCaseImpl implements ListLocalizedBusinessCategoriesUseCase {
  constructor(
    private readonly localizedBusinessCategoryRepository: LocalizedBusinessCategoryRepository,
  ) {}

  execute(locale?: string): Promise<LocalizedBusinessCategory[]> {
    return this.localizedBusinessCategoryRepository.list(locale);
  }
}
