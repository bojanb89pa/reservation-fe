import type {
  BusinessLocationResourceRepository,
  AddResourceToLocationUseCase,
  BusinessLocationResource,
  AddResourceToLocationCommand,
} from '@domain';

export class AddResourceToLocationUseCaseImpl implements AddResourceToLocationUseCase {
  constructor(private readonly businessLocationResourceRepository: BusinessLocationResourceRepository) {}

  execute(businessId: string, locationId: string, command: AddResourceToLocationCommand): Promise<BusinessLocationResource> {
    return this.businessLocationResourceRepository.add(businessId, locationId, command);
  }
}
