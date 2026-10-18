import type {
  ClientApplication,
  ClientApplicationDetail,
  CreateClientApplicationCommand,
  SetClientApplicationEnabledCommand,
} from '../entities/ClientApplication';

export interface ClientApplicationRepository {
  register(command: CreateClientApplicationCommand): Promise<ClientApplication>;
  getAll(): Promise<ClientApplication[]>;
  /** Rejects with `NotFoundError` when the application does not exist. */
  getById(id: string): Promise<ClientApplicationDetail>;
  /** Admin only. Rejects with `NotFoundError` when the application does not exist. */
  setEnabled(command: SetClientApplicationEnabledCommand): Promise<ClientApplication>;
}
