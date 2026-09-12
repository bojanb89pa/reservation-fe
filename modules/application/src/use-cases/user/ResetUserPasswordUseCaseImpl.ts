import type {
  UserRepository,
  ResetUserPasswordUseCase,
  User,
  ResetUserPasswordCommand,
} from '@domain';

export class ResetUserPasswordUseCaseImpl implements ResetUserPasswordUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  execute(id: string, command: ResetUserPasswordCommand): Promise<User> {
    return this.userRepository.resetPassword(id, command);
  }
}
