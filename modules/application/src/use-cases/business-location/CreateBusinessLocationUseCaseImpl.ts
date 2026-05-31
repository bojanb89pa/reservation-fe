import type {
  BusinessLocationRepository,
  CreateBusinessLocationUseCase,
  CreateBusinessLocationCommand,
  BusinessLocation,
} from '@domain';

export class CreateBusinessLocationUseCaseImpl implements CreateBusinessLocationUseCase {
  constructor(private readonly businessLocationRepository: BusinessLocationRepository) {}

  execute(businessId: string, command: CreateBusinessLocationCommand): Promise<BusinessLocation> {
    return this.businessLocationRepository.create(businessId, command);
  }
}
