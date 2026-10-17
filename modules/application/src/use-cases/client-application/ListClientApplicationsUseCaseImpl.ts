import type {
  ClientApplication,
  ClientApplicationRepository,
  ListClientApplicationsUseCase,
} from '@fe/domain';

export class ListClientApplicationsUseCaseImpl implements ListClientApplicationsUseCase {
  constructor(private readonly clientApplicationRepository: ClientApplicationRepository) {}

  execute(): Promise<ClientApplication[]> {
    return this.clientApplicationRepository.getAll();
  }
}
