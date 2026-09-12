import type { UserRepository, GetUserByIdForAdminUseCase, User } from '@domain';

export class GetUserByIdForAdminUseCaseImpl implements GetUserByIdForAdminUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  execute(id: string): Promise<User> {
    return this.userRepository.getByIdForAdmin(id);
  }
}
