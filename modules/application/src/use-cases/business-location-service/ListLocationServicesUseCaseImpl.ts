import type {
  BusinessLocationServiceRepository,
  ListLocationServicesUseCase,
  BusinessLocationService,
} from '@fe/domain';

export class ListLocationServicesUseCaseImpl implements ListLocationServicesUseCase {
  constructor(
    private readonly businessLocationServiceRepository: BusinessLocationServiceRepository,
  ) {}

  execute(businessId: string, locationId: string): Promise<BusinessLocationService[]> {
    return this.businessLocationServiceRepository.list(businessId, locationId);
  }
}
