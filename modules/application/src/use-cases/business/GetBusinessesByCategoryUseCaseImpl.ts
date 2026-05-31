import type {
  BusinessRepository,
  GetBusinessesByCategoryUseCase,
  Business,
  PageRequest,
  PageResponse,
} from '@domain';

export class GetBusinessesByCategoryUseCaseImpl implements GetBusinessesByCategoryUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(categoryId: string, pageRequest: PageRequest): Promise<PageResponse<Business>> {
    return this.businessRepository.getByCategory(categoryId, pageRequest);
  }
}
