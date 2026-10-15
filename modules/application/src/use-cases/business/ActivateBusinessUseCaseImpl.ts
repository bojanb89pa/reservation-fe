import type { BusinessRepository, ActivateBusinessUseCase, Business } from '@fe/domain';

export class ActivateBusinessUseCaseImpl implements ActivateBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string): Promise<Business> {
    return this.businessRepository.activate(id);
  }
}
