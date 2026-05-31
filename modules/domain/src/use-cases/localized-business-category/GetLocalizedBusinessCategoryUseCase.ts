import type { LocalizedBusinessCategory } from '../../entities/LocalizedBusinessCategory';

export interface GetLocalizedBusinessCategoryUseCase {
  execute(id: string): Promise<LocalizedBusinessCategory>;
}
