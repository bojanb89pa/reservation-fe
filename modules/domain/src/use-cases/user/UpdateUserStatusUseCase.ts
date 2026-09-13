import type { User, UpdateUserStatusCommand } from '../../entities/User';

export interface UpdateUserStatusUseCase {
  execute(id: string, command: UpdateUserStatusCommand): Promise<User>;
}
