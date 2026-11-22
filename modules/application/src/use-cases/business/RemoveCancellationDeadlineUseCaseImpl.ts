import type { BusinessRepository, RemoveCancellationDeadlineUseCase, Business } from '@fe/domain';

export class RemoveCancellationDeadlineUseCaseImpl implements RemoveCancellationDeadlineUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string): Promise<Business> {
    return this.businessRepository.removeCancellationDeadline(id);
  }
}
