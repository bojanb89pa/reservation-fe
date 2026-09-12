import type {
  UserRepository,
  SetProfilePictureUseCase,
  SetProfilePictureCommand,
  User,
} from '@domain';

export class SetProfilePictureUseCaseImpl implements SetProfilePictureUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: SetProfilePictureCommand): Promise<User> {
    return this.userRepository.setProfilePicture(command);
  }
}
