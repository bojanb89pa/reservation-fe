import type {
  BusinessCategory,
  CreateBusinessCategoryCommand,
  UpdateBusinessCategoryCommand,
  UpdateBusinessCategoryAppearanceCommand,
} from '../entities/BusinessCategory';

export interface BusinessCategoryRepository {
  list(): Promise<BusinessCategory[]>;
  get(id: string): Promise<BusinessCategory>;
  create(command: CreateBusinessCategoryCommand): Promise<BusinessCategory>;
  update(id: string, command: UpdateBusinessCategoryCommand): Promise<BusinessCategory>;
  delete(id: string): Promise<BusinessCategory>;
  updateAppearance(
    id: string,
    command: UpdateBusinessCategoryAppearanceCommand,
  ): Promise<BusinessCategory>;
}
