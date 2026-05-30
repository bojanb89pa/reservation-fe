import type {
  BusinessCategory,
  UpdateBusinessCategoryAppearanceCommand,
} from '../../entities/BusinessCategory';

export interface UpdateBusinessCategoryAppearanceUseCase {
  execute(id: string, command: UpdateBusinessCategoryAppearanceCommand): Promise<BusinessCategory>;
}
