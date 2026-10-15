import type { AuthRepository, LoginUseCase, AuthCredentials, AuthSession } from '@fe/domain';

export class LoginUseCaseImpl implements LoginUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(credentials: AuthCredentials): Promise<AuthSession> {
    return this.authRepository.login(credentials.email, credentials.password);
  }
}
