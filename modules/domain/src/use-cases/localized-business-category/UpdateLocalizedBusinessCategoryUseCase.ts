import type {
  LocalizedBusinessCategory,
  UpdateLocalizedBusinessCategoryCommand,
} from '../../entities/LocalizedBusinessCategory';

export interface UpdateLocalizedBusinessCategoryUseCase {
  execute(
    id: string,
    command: UpdateLocalizedBusinessCategoryCommand,
  ): Promise<LocalizedBusinessCategory>;
}
