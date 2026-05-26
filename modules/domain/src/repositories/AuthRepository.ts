import type { AuthSession } from '../entities/AuthSession';
import type { User, UserRegistration } from '../entities/User';

export interface AuthRepository {
  login(email: string, password: string): Promise<AuthSession>;
  register(registration: UserRegistration): Promise<User>;
  refreshToken(refreshToken: string): Promise<AuthSession>;
}
