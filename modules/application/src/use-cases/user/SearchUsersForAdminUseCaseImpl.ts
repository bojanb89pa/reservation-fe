import type {
  UserRepository,
  SearchUsersForAdminUseCase,
  User,
  AdminUserSearchFilter,
  PageRequest,
  PageResponse,
} from '@fe/domain';

export class SearchUsersForAdminUseCaseImpl implements SearchUsersForAdminUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  execute(filter: AdminUserSearchFilter, pageRequest: PageRequest): Promise<PageResponse<User>> {
    return this.userRepository.searchForAdmin(filter, pageRequest);
  }
}
