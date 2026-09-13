import type {
  User,
  SetProfilePictureCommand,
  AdminCreateUserCommand,
  AdminUpdateUserCommand,
  UpdateUserStatusCommand,
  ResetUserPasswordCommand,
} from '../entities/User';
import type { PageRequest, PageResponse } from '../types/Page';
import type { AdminUserSearchFilter } from '../types/AdminUserSearchFilter';

export interface UserRepository {
  setProfilePicture(command: SetProfilePictureCommand): Promise<User>;
  deleteProfilePicture(): Promise<User>;
  getUsersByIds(ids: string[]): Promise<User[]>;
  // WARNING: reusing the shared non-nullable PageResponse<T> — the fe-brief's generic TS
  // snippet marks page/totalElements/totalPages nullable, but its own JSON example returns
  // concrete numbers, matching the existing shared type. Verify before merging.
  searchForAdmin(
    filter: AdminUserSearchFilter,
    pageRequest: PageRequest,
  ): Promise<PageResponse<User>>;
  getByIdForAdmin(id: string): Promise<User>;
  createByAdmin(command: AdminCreateUserCommand): Promise<User>;
  updateByAdmin(id: string, command: AdminUpdateUserCommand): Promise<User>;
  updateStatus(id: string, command: UpdateUserStatusCommand): Promise<User>;
  resetPassword(id: string, command: ResetUserPasswordCommand): Promise<User>;
  deleteByAdmin(id: string): Promise<void>;
}
