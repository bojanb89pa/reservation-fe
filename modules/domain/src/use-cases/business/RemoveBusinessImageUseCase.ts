import type { Business } from '../../entities/Business';

export interface RemoveBusinessImageUseCase {
  execute(id: string): Promise<Business>;
}
