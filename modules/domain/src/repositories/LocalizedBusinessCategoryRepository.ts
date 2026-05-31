import type {
  LocalizedBusinessCategory,
  CreateLocalizedBusinessCategoryCommand,
  UpdateLocalizedBusinessCategoryCommand,
  UpsertTranslationCommand,
} from '../entities/LocalizedBusinessCategory';

export interface LocalizedBusinessCategoryRepository {
  list(): Promise<LocalizedBusinessCategory[]>;
  get(id: string): Promise<LocalizedBusinessCategory>;
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
