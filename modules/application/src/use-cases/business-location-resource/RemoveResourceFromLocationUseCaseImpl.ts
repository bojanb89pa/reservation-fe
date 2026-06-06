import type {
  BusinessLocationResourceRepository,
  RemoveResourceFromLocationUseCase,
} from '@domain';

export class RemoveResourceFromLocationUseCaseImpl implements RemoveResourceFromLocationUseCase {
  constructor(
    private readonly businessLocationResourceRepository: BusinessLocationResourceRepository,
  ) {}

  execute(businessId: string, locationId: string, resourceId: string): Promise<void> {
    return this.businessLocationResourceRepository.remove(businessId, locationId, resourceId);
  }
}
