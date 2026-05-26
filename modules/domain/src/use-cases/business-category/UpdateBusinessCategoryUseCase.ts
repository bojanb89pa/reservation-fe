import type {
  BusinessCategory,
  UpdateBusinessCategoryCommand,
} from '../../entities/BusinessCategory';

export interface UpdateBusinessCategoryUseCase {
  execute(id: string, command: UpdateBusinessCategoryCommand): Promise<BusinessCategory>;
}
