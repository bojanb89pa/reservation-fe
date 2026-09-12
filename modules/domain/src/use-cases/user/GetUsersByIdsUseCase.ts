import type { User } from '../../entities/User';

export interface GetUsersByIdsUseCase {
  execute(ids: string[]): Promise<User[]>;
}
