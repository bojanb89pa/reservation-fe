import type {
  UserRepository,
  UpdateUserByAdminUseCase,
  User,
  AdminUpdateUserCommand,
} from '@domain';

export class UpdateUserByAdminUseCaseImpl implements UpdateUserByAdminUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  execute(id: string, command: AdminUpdateUserCommand): Promise<User> {
    return this.userRepository.updateByAdmin(id, command);
  }
}
