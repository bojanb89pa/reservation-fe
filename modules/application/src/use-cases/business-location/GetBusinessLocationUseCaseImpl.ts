import type {
  BusinessLocationRepository,
  GetBusinessLocationUseCase,
  BusinessLocation,
} from '@fe/domain';

export class GetBusinessLocationUseCaseImpl implements GetBusinessLocationUseCase {
  constructor(private readonly businessLocationRepository: BusinessLocationRepository) {}

  execute(businessId: string, locationId: string): Promise<BusinessLocation> {
    return this.businessLocationRepository.getById(businessId, locationId);
  }
}
