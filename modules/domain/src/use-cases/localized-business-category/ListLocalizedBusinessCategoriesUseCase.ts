import type { LocalizedBusinessCategory } from '../../entities/LocalizedBusinessCategory';

export interface ListLocalizedBusinessCategoriesUseCase {
  execute(): Promise<LocalizedBusinessCategory[]>;
}
