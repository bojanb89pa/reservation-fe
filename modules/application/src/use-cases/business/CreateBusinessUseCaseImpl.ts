import type {
  BusinessRepository,
  SubmitBusinessUseCase,
  SubmitBusinessCommand,
  Business,
} from '@fe/domain';

export class CreateBusinessUseCaseImpl implements SubmitBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(command: SubmitBusinessCommand): Promise<Business> {
    return this.businessRepository.submit(command);
  }
}
