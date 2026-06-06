import type {
  BusinessRepository,
  GetAllBusinessesForAdminUseCase,
  Business,
  PageRequest,
  PageResponse,
} from '@domain';

export class GetAllBusinessesForAdminUseCaseImpl implements GetAllBusinessesForAdminUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(pageRequest: PageRequest): Promise<PageResponse<Business>> {
    return this.businessRepository.getAllForAdmin(pageRequest);
  }
}
