import type { AuthRepository, RegisterUseCase, User, UserRegistration } from '@domain';

export class RegisterUseCaseImpl implements RegisterUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(registration: UserRegistration): Promise<User> {
    return this.authRepository.register(registration);
  }
}
