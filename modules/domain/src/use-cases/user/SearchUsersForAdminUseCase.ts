import type { User } from '../../entities/User';
import type { PageRequest, PageResponse } from '../../types/Page';
import type { AdminUserSearchFilter } from '../../types/AdminUserSearchFilter';

export interface SearchUsersForAdminUseCase {
  execute(filter: AdminUserSearchFilter, pageRequest: PageRequest): Promise<PageResponse<User>>;
}
