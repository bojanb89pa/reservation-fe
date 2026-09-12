import type {
  UserRepository,
  CreateUserByAdminUseCase,
  User,
  AdminCreateUserCommand,
} from '@domain';

export class CreateUserByAdminUseCaseImpl implements CreateUserByAdminUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  execute(command: AdminCreateUserCommand): Promise<User> {
    return this.userRepository.createByAdmin(command);
  }
}
