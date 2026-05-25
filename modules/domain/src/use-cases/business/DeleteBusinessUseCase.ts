import type { Business } from '../../entities/Business';

export interface DeleteBusinessUseCase {
  execute(id: string): Promise<Business>;
}
