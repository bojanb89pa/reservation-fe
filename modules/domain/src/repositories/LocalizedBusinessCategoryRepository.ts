import type {
  LocalizedBusinessCategory,
  CreateLocalizedBusinessCategoryCommand,
  UpdateLocalizedBusinessCategoryCommand,
  UpsertTranslationCommand,
} from '../entities/LocalizedBusinessCategory';

export interface LocalizedBusinessCategoryRepository {
  list(locale?: string): Promise<LocalizedBusinessCategory[]>;
  get(id: string, locale?: string): Promise<LocalizedBusinessCategory>;
  create(command: CreateLocalizedBusinessCategoryCommand): Promise<LocalizedBusinessCategory>;
  update(
    id: string,
    command: UpdateLocalizedBusinessCategoryCommand,
  ): Promise<LocalizedBusinessCategory>;
  upsertTranslation(
    id: string,
    locale: string,
    command: UpsertTranslationCommand,
  ): Promise<LocalizedBusinessCategory>;
}
