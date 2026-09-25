import type {
  ClientApplication,
  CreateClientApplicationCommand,
} from '../entities/ClientApplication';

export interface ClientApplicationRepository {
  register(command: CreateClientApplicationCommand): Promise<ClientApplication>;
}
