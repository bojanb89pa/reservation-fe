import type {
  ClientApplicationConsentRepository,
  ListMyClientApplicationConsentsUseCase,
  OwnerClientApplicationConsent,
} from '@fe/domain';

export class ListMyClientApplicationConsentsUseCaseImpl implements ListMyClientApplicationConsentsUseCase {
  constructor(private readonly consentRepository: ClientApplicationConsentRepository) {}

  execute(): Promise<OwnerClientApplicationConsent[]> {
    return this.consentRepository.getMine();
  }
}
