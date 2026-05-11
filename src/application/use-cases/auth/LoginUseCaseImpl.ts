import type { AuthRepository } from '@domain/repositories/AuthRepository';
import type { LoginUseCase } from '@domain/use-cases/auth/LoginUseCase';
import type { AuthCredentials, AuthSession } from '@domain/entities/AuthSession';

export class LoginUseCaseImpl implements LoginUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(credentials: AuthCredentials): Promise<AuthSession> {
    return this.authRepository.login(credentials.email, credentials.password);
  }
}
