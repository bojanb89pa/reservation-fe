import type {
  ClientApplicationDetail,
  ClientApplicationRepository,
  GetClientApplicationUseCase,
} from '@fe/domain';

export class GetClientApplicationUseCaseImpl implements GetClientApplicationUseCase {
  constructor(private readonly clientApplicationRepository: ClientApplicationRepository) {}

  execute(id: string): Promise<ClientApplicationDetail> {
    return this.clientApplicationRepository.getById(id);
  }
}
