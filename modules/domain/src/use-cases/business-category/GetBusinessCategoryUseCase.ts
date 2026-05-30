import type { BusinessCategory } from '../../entities/BusinessCategory';

export interface GetBusinessCategoryUseCase {
  execute(id: string, locale: string): Promise<BusinessCategory>;
}
