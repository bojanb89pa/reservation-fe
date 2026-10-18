import type {
  ClientApplication,
  ClientApplicationRepository,
  SetClientApplicationEnabledCommand,
  SetClientApplicationEnabledUseCase,
} from '@fe/domain';
import { ValidationError } from '@fe/domain';

export class SetClientApplicationEnabledUseCaseImpl implements SetClientApplicationEnabledUseCase {
  constructor(private readonly clientApplicationRepository: ClientApplicationRepository) {}

  async execute(command: SetClientApplicationEnabledCommand): Promise<ClientApplication> {
    // WARNING: treating whitespace-only id as empty is a conservative choice — verify against BE contract before merging
    if (!command.clientApplicationId.trim()) {
      throw new ValidationError('clientApplicationId is required', 'clientApplicationId');
    }
    return this.clientApplicationRepository.setEnabled(command);
  }
}
