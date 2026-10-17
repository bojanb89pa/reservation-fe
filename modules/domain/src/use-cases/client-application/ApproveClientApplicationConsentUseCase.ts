import type { ClientApplicationLocationConsent } from '../../entities/ClientApplication';

export interface ApproveClientApplicationConsentUseCase {
  execute(consentId: string): Promise<ClientApplicationLocationConsent>;
}
