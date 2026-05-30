import type {
  LocalizedBusinessCategory,
  UpsertTranslationCommand,
} from '../../entities/LocalizedBusinessCategory';

export interface UpsertLocalizedBusinessCategoryTranslationUseCase {
  execute(
    id: string,
    locale: string,
    command: UpsertTranslationCommand,
  ): Promise<LocalizedBusinessCategory>;
}
