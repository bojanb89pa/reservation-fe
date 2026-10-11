import type { User, UpdateOwnProfileCommand } from '../../entities/User';

export interface UpdateOwnProfileUseCase {
  execute(command: UpdateOwnProfileCommand): Promise<User>;
}
