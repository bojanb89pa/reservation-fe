import type { BusinessRepository, SetBusinessImageUseCase, Business } from '@fe/domain';

export class SetBusinessImageUseCaseImpl implements SetBusinessImageUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string, uploadId: string): Promise<Business> {
    return this.businessRepository.setImage(id, { uploadId });
  }
}
