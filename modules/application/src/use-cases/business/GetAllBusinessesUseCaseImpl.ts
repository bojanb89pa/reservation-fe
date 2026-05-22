import type {
  BusinessRepository,
  GetAllBusinessesUseCase,
  Business,
  PageRequest,
  PageResponse,
} from '@domain';

export class GetAllBusinessesUseCaseImpl implements GetAllBusinessesUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(pageRequest: PageRequest): Promise<PageResponse<Business>> {
    return this.businessRepository.getAll(pageRequest);
  }
}
