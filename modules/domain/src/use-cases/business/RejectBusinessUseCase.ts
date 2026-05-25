import type { Business } from '../../entities/Business';

export interface RejectBusinessUseCase {
  execute(id: string): Promise<Business>;
}
