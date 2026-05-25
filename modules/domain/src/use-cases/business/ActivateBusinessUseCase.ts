import type { Business } from '../../entities/Business';

export interface ActivateBusinessUseCase {
  execute(id: string): Promise<Business>;
}
