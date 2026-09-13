import type { Role } from './Role';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface User {
  id: string | null;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  enabled: boolean | null;
  /**
   * Administrative account state, independent from `enabled` (which historically tracks
   * self-service email activation). The two are not guaranteed to be in sync.
   */
  status: UserStatus;
  /** Relative path such as "/auth/users/<id>/profile-picture", or null when there is no image. */
  profilePictureUrl: string | null;
}

export interface UserRegistration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Currently ignored by the backend on registration; a picture can only be set after activation via SetProfilePictureCommand. */
  profilePictureUploadId?: string | null;
}

export interface SetProfilePictureCommand {
  uploadId: string;
}

export interface AdminCreateUserCommand {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: Role[];
}

export interface AdminUpdateUserCommand {
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
}

// WARNING: BLOCKED may need a reason/audit field later per BE brief note — same contract for now, verify before merging
export interface UpdateUserStatusCommand {
  status: UserStatus;
}

export interface ResetUserPasswordCommand {
  newPassword: string;
}
