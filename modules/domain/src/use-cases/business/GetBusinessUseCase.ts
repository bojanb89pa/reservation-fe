import type { Business } from '../../entities/Business';

export interface GetBusinessUseCase {
  execute(id: string): Promise<Business>;
}
