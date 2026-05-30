import type {
  LocalizedBusinessCategoryRepository,
  GetLocalizedBusinessCategoryUseCase,
  LocalizedBusinessCategory,
} from '@domain';

export class GetLocalizedBusinessCategoryUseCaseImpl implements GetLocalizedBusinessCategoryUseCase {
  constructor(
    private readonly localizedBusinessCategoryRepository: LocalizedBusinessCategoryRepository,
  ) {}

  execute(id: string, locale?: string): Promise<LocalizedBusinessCategory> {
    return this.localizedBusinessCategoryRepository.get(id, locale);
  }
}
