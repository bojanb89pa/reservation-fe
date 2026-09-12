import type { User, AdminCreateUserCommand } from '../../entities/User';

export interface CreateUserByAdminUseCase {
  execute(command: AdminCreateUserCommand): Promise<User>;
}
