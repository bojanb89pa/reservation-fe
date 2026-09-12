import type { UserRepository, GetUsersByIdsUseCase, User } from '@domain';

export class GetUsersByIdsUseCaseImpl implements GetUsersByIdsUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(ids: string[]): Promise<User[]> {
    return this.userRepository.getUsersByIds(ids);
  }
}
