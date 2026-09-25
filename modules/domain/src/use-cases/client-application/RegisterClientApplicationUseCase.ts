import type {
  ClientApplication,
  CreateClientApplicationCommand,
} from '../../entities/ClientApplication';

export interface RegisterClientApplicationUseCase {
  execute(command: CreateClientApplicationCommand): Promise<ClientApplication>;
}
