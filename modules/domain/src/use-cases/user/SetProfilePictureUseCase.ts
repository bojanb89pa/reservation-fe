import type { User, SetProfilePictureCommand } from '../../entities/User';

export interface SetProfilePictureUseCase {
  execute(command: SetProfilePictureCommand): Promise<User>;
}
