import type {
  UserRepository,
  UpdateUserStatusUseCase,
  User,
  UpdateUserStatusCommand,
} from '@domain';

export class UpdateUserStatusUseCaseImpl implements UpdateUserStatusUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  execute(id: string, command: UpdateUserStatusCommand): Promise<User> {
    return this.userRepository.updateStatus(id, command);
  }
}
