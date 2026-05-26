import type { BusinessCategory } from '../../entities/BusinessCategory';

export interface ListBusinessCategoriesUseCase {
  execute(): Promise<BusinessCategory[]>;
}
