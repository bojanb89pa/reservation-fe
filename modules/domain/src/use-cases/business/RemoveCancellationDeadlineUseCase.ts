import type { Business } from '../../entities/Business';

export interface RemoveCancellationDeadlineUseCase {
  execute(id: string): Promise<Business>;
}
