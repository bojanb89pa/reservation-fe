import type { User, ResetUserPasswordCommand } from '../../entities/User';

export interface ResetUserPasswordUseCase {
  execute(id: string, command: ResetUserPasswordCommand): Promise<User>;
}
