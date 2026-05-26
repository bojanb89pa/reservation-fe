import type {
  BusinessCategoryRepository,
  DeleteBusinessCategoryUseCase,
  BusinessCategory,
} from '@domain';

export class DeleteBusinessCategoryUseCaseImpl implements DeleteBusinessCategoryUseCase {
  constructor(private readonly businessCategoryRepository: BusinessCategoryRepository) {}

  execute(id: string): Promise<BusinessCategory> {
    return this.businessCategoryRepository.delete(id);
  }
}
