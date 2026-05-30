export interface BusinessCategory {
  id: string;
  name: string;
  parentId: string | null;
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
