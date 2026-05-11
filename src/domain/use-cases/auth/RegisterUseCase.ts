import type { User, UserRegistration } from '../../entities/User';

export interface RegisterUseCase {
  execute(registration: UserRegistration): Promise<User>;
}
