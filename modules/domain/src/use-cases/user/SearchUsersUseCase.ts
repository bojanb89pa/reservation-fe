import type { UserSummary } from '../../entities/UserSummary';
import type { SearchUsersQuery } from '../../types/SearchUsersQuery';

export interface SearchUsersUseCase {
  execute(query: SearchUsersQuery): Promise<UserSummary[]>;
}
