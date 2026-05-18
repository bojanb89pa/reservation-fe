import type { BusinessRepository, CreateBusinessUseCase, Business } from '@domain';

export class CreateBusinessUseCaseImpl implements CreateBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(command: Pick<Business, 'name'>): Promise<Business> {
    return this.businessRepository.create(command);
  }
}
