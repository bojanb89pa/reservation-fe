export interface BusinessCategory {
  id: string;
  name: string;
  parentId: string | null;
  symbol: string | null;
  color: string | null;
}

export interface CreateBusinessCategoryCommand {
  code: string;
  parentId?: string;
  translations: Record<string, string>;
}

export interface UpdateBusinessCategoryCommand {
  code?: string;
  parentId?: string;
  translations: Record<string, string>;
}

export interface UpdateBusinessCategoryAppearanceCommand {
  symbol: string | null;
  color: string | null;
}

export const DEFAULT_CATEGORY_SYMBOL = '🏢';
export const DEFAULT_CATEGORY_COLOR = '#6B7280';
