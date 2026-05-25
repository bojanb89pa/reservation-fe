import type {
  BusinessRepository,
  SubmitBusinessUseCase,
  SubmitBusinessCommand,
  Business,
} from '@domain';

export class SubmitBusinessUseCaseImpl implements SubmitBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(command: SubmitBusinessCommand): Promise<Business> {
    return this.businessRepository.submit(command);
  }
}
