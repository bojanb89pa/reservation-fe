import type {
  LocalizedBusinessCategoryRepository,
  UpsertLocalizedBusinessCategoryTranslationUseCase,
  LocalizedBusinessCategory,
  UpsertTranslationCommand,
} from '@domain';

export class UpsertLocalizedBusinessCategoryTranslationUseCaseImpl implements UpsertLocalizedBusinessCategoryTranslationUseCase {
  constructor(
    private readonly localizedBusinessCategoryRepository: LocalizedBusinessCategoryRepository,
  ) {}

  execute(
    id: string,
    locale: string,
    command: UpsertTranslationCommand,
  ): Promise<LocalizedBusinessCategory> {
    return this.localizedBusinessCategoryRepository.upsertTranslation(id, locale, command);
  }
}
