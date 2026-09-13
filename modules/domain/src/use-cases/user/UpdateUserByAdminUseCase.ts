import type { User, AdminUpdateUserCommand } from '../../entities/User';

export interface UpdateUserByAdminUseCase {
  execute(id: string, command: AdminUpdateUserCommand): Promise<User>;
}
