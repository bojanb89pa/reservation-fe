import type { LocalizedBusinessCategory } from '../../entities/LocalizedBusinessCategory';

export interface ListLocalizedBusinessCategoriesUseCase {
  execute(locale?: string): Promise<LocalizedBusinessCategory[]>;
}
