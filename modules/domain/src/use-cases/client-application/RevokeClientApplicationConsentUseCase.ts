import type { ClientApplicationLocationConsent } from '../../entities/ClientApplication';

export interface RevokeClientApplicationConsentUseCase {
  execute(consentId: string): Promise<ClientApplicationLocationConsent>;
}
