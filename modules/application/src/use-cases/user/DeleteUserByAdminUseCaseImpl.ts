import type { UserRepository, DeleteUserByAdminUseCase } from '@domain';

export class DeleteUserByAdminUseCaseImpl implements DeleteUserByAdminUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  execute(id: string): Promise<void> {
    return this.userRepository.deleteByAdmin(id);
  }
}
