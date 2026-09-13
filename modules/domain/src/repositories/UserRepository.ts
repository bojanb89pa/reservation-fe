import type { User, SetProfilePictureCommand } from '../entities/User';
import type { UserSummary } from '../entities/UserSummary';
import type { SearchUsersQuery } from '../types/SearchUsersQuery';

export interface UserRepository {
  setProfilePicture(command: SetProfilePictureCommand): Promise<User>;
  deleteProfilePicture(): Promise<User>;
  getUsersByIds(ids: string[]): Promise<User[]>;
  searchUsers(query: SearchUsersQuery): Promise<UserSummary[]>;
}
