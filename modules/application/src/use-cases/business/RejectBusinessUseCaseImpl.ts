import type { BusinessRepository, RejectBusinessUseCase, Business } from '@fe/domain';

export class RejectBusinessUseCaseImpl implements RejectBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string): Promise<Business> {
    return this.businessRepository.reject(id);
  }
}
