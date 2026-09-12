import type { User, SetProfilePictureCommand } from '../entities/User';

export interface UserRepository {
  setProfilePicture(command: SetProfilePictureCommand): Promise<User>;
  deleteProfilePicture(): Promise<User>;
  getUsersByIds(ids: string[]): Promise<User[]>;
}
