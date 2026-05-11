import type { Business } from '../../entities/Business';

export interface CreateBusinessUseCase {
  execute(command: Pick<Business, 'name'>): Promise<Business>;
}
