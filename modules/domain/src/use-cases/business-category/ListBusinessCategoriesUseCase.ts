import type { BusinessCategory } from '../../entities/BusinessCategory';

export interface ListBusinessCategoriesUseCase {
  execute(locale: string): Promise<BusinessCategory[]>;
}
