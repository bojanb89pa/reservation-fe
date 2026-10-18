import type { ClientApplication } from '../../entities/ClientApplication';

export interface ListClientApplicationsUseCase {
  execute(): Promise<ClientApplication[]>;
}
