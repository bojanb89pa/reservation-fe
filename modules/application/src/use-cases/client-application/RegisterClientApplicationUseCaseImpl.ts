import type {
  ClientApplication,
  ClientApplicationRepository,
  CreateClientApplicationCommand,
  RegisterClientApplicationUseCase,
} from '@domain';

export class RegisterClientApplicationUseCaseImpl implements RegisterClientApplicationUseCase {
  constructor(private readonly clientApplicationRepository: ClientApplicationRepository) {}

  execute(command: CreateClientApplicationCommand): Promise<ClientApplication> {
    return this.clientApplicationRepository.register(command);
  }
}
