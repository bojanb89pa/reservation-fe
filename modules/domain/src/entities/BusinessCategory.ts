export interface BusinessCategory {
  id: string;
  name: string;
  parentId: string | null;
}

export interface CreateBusinessCategoryCommand {
  name: string;
  parentId?: string;
}

export interface UpdateBusinessCategoryCommand {
  name: string;
  parentId?: string;
}
