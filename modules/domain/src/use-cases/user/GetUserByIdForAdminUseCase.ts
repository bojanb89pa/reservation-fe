import type { User } from '../../entities/User';

export interface GetUserByIdForAdminUseCase {
  execute(id: string): Promise<User>;
}
