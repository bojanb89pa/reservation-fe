import type { BusinessRepository, RejectBusinessUseCase, Business } from '@domain';

export class RejectBusinessUseCaseImpl implements RejectBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string): Promise<Business> {
    return this.businessRepository.reject(id);
  }
}
