import type {
  LocalizedBusinessCategory,
  CreateLocalizedBusinessCategoryCommand,
} from '../../entities/LocalizedBusinessCategory';

export interface CreateLocalizedBusinessCategoryUseCase {
  execute(command: CreateLocalizedBusinessCategoryCommand): Promise<LocalizedBusinessCategory>;
}
