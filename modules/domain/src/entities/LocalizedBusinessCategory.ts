export interface BusinessCategoryTranslation {
  locale: string;
  name: string;
}

export interface LocalizedBusinessCategory {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  translations: BusinessCategoryTranslation[];
}

export interface CreateLocalizedBusinessCategoryCommand {
  code: string;
  parentId?: string;
  translations: BusinessCategoryTranslation[];
}

export interface UpdateLocalizedBusinessCategoryCommand {
  translations: BusinessCategoryTranslation[];
}

export interface UpsertTranslationCommand {
  name: string;
}
