import type {
  ClientApplicationConsentRepository,
  ClientApplicationLocationConsent,
  RevokeClientApplicationConsentUseCase,
} from '@fe/domain';

export class RevokeClientApplicationConsentUseCaseImpl implements RevokeClientApplicationConsentUseCase {
  constructor(private readonly consentRepository: ClientApplicationConsentRepository) {}

  execute(consentId: string): Promise<ClientApplicationLocationConsent> {
    return this.consentRepository.revoke(consentId);
  }
}
