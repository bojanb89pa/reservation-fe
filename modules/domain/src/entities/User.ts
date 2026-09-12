import type { Role } from './Role';

export interface User {
  id: string | null;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  enabled: boolean | null;
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
