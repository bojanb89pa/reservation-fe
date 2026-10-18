import type {
  ApproveClientApplicationConsentUseCase,
  ClientApplicationConsentRepository,
  ClientApplicationLocationConsent,
} from '@fe/domain';

export class ApproveClientApplicationConsentUseCaseImpl implements ApproveClientApplicationConsentUseCase {
  constructor(private readonly consentRepository: ClientApplicationConsentRepository) {}

  execute(consentId: string): Promise<ClientApplicationLocationConsent> {
    return this.consentRepository.approve(consentId);
  }
}
