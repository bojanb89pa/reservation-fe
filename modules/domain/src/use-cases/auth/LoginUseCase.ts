import type { AuthSession, AuthCredentials } from '../../entities/AuthSession';

export interface LoginUseCase {
  execute(credentials: AuthCredentials): Promise<AuthSession>;
}
