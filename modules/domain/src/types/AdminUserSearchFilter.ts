import type { UserStatus } from '../entities/User';

export interface AdminUserSearchFilter {
  search?: string;
  status?: UserStatus;
}
