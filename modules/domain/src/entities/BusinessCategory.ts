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
  /** Optional; omit or send null to keep the existing code. Never send an empty/blank string (BE returns 400). */
  code?: string | null;
  parentId?: string | null;
  translations: Record<string, string>;
}

export interface UpdateBusinessCategoryAppearanceCommand {
  symbol: string | null;
  color: string | null;
}

export const DEFAULT_CATEGORY_SYMBOL = '🏢';
export const DEFAULT_CATEGORY_COLOR = '#6B7280';
