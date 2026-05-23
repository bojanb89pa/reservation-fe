import type {
  BusinessRepository,
  GetMyBusinessesUseCase,
  Business,
  PageRequest,
  PageResponse,
} from '@domain';

export class GetMyBusinessesUseCaseImpl implements GetMyBusinessesUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(pageRequest: PageRequest): Promise<PageResponse<Business>> {
    return this.businessRepository.getMyBusinesses(pageRequest);
  }
}
