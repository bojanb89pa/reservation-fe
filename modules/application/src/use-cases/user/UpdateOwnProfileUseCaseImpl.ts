import type {
  UserRepository,
  UpdateOwnProfileUseCase,
  UpdateOwnProfileCommand,
  User,
} from '@domain';

export class UpdateOwnProfileUseCaseImpl implements UpdateOwnProfileUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: UpdateOwnProfileCommand): Promise<User> {
    return this.userRepository.updateOwnProfile(command);
  }
}
