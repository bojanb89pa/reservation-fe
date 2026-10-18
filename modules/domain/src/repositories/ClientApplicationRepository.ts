import type {
  ClientApplication,
  ClientApplicationDetail,
  CreateClientApplicationCommand,
} from '../entities/ClientApplication';

export interface ClientApplicationRepository {
  register(command: CreateClientApplicationCommand): Promise<ClientApplication>;
  getAll(): Promise<ClientApplication[]>;
  /** Rejects with `NotFoundError` when the application does not exist. */
  getById(id: string): Promise<ClientApplicationDetail>;
}
