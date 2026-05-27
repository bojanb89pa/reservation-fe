import type { Business } from '../../entities/Business';

export interface SetBusinessCategoryUseCase {
  execute(id: string, categoryId: string | null): Promise<Business>;
}
