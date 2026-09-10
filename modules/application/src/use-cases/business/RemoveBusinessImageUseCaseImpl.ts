import type { BusinessRepository, RemoveBusinessImageUseCase, Business } from '@domain';

export class RemoveBusinessImageUseCaseImpl implements RemoveBusinessImageUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string): Promise<Business> {
    return this.businessRepository.removeImage(id);
  }
}
