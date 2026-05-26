import type {
  BusinessCategory,
  CreateBusinessCategoryCommand,
} from '../../entities/BusinessCategory';

export interface CreateBusinessCategoryUseCase {
  execute(command: CreateBusinessCategoryCommand): Promise<BusinessCategory>;
}
