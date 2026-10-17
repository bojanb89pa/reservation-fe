import type {
  ClientApplicationLocationConsent,
  OwnerClientApplicationConsent,
} from '../entities/ClientApplication';

/** Consents for locations of businesses the current user owns. */
export interface ClientApplicationConsentRepository {
  getMine(): Promise<OwnerClientApplicationConsent[]>;
  /** Rejects with `NotFoundError` when the consent does not exist or is not the owner's. */
  approve(consentId: string): Promise<ClientApplicationLocationConsent>;
  /** Rejects with `NotFoundError` when the consent does not exist or is not the owner's. */
  revoke(consentId: string): Promise<ClientApplicationLocationConsent>;
}
