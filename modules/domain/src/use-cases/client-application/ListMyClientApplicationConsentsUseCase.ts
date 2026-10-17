import type { OwnerClientApplicationConsent } from '../../entities/ClientApplication';

export interface ListMyClientApplicationConsentsUseCase {
  execute(): Promise<OwnerClientApplicationConsent[]>;
}
