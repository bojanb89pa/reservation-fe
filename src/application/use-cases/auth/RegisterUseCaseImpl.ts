import type { AuthRepository } from '@domain/repositories/AuthRepository';
import type { RegisterUseCase } from '@domain/use-cases/auth/RegisterUseCase';
import type { User, UserRegistration } from '@domain/entities/User';

export class RegisterUseCaseImpl implements RegisterUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(registration: UserRegistration): Promise<User> {
    return this.authRepository.register(registration);
  }
}
