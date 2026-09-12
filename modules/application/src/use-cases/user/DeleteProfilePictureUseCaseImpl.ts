import type { UserRepository, DeleteProfilePictureUseCase, User } from '@domain';

export class DeleteProfilePictureUseCaseImpl implements DeleteProfilePictureUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<User> {
    return this.userRepository.deleteProfilePicture();
  }
}
