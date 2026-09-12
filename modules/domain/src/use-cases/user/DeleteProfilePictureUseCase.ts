import type { User } from '../../entities/User';

export interface DeleteProfilePictureUseCase {
  execute(): Promise<User>;
}
