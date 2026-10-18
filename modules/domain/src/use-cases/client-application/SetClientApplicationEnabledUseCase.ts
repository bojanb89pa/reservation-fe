import type {
  ClientApplication,
  SetClientApplicationEnabledCommand,
} from '../../entities/ClientApplication';

export interface SetClientApplicationEnabledUseCase {
  execute(command: SetClientApplicationEnabledCommand): Promise<ClientApplication>;
}
