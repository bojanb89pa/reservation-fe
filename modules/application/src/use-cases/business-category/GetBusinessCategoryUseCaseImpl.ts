import type {
  BusinessCategoryRepository,
  GetBusinessCategoryUseCase,
  BusinessCategory,
} from '@domain';

export class GetBusinessCategoryUseCaseImpl implements GetBusinessCategoryUseCase {
  constructor(private readonly businessCategoryRepository: BusinessCategoryRepository) {}

  execute(id: string, locale: string): Promise<BusinessCategory> {
    return this.businessCategoryRepository.get(id, locale);
  }
}
