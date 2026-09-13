import type {
  UserRepository,
  SearchUsersUseCase,
  UserSummary,
  SearchUsersQuery,
} from '@domain';

export class SearchUsersUseCaseImpl implements SearchUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  execute(query: SearchUsersQuery): Promise<UserSummary[]> {
    return this.userRepository.searchUsers(query);
  }
}
