import type { BusinessCategory } from '../../entities/BusinessCategory';

export interface DeleteBusinessCategoryUseCase {
  execute(id: string): Promise<BusinessCategory>;
}
