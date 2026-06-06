import type {
  BusinessLocationServiceRepository,
  AddServiceToLocationUseCase,
  BusinessLocationService,
  AddServiceToLocationCommand,
} from '@domain';

export class AddServiceToLocationUseCaseImpl implements AddServiceToLocationUseCase {
  constructor(
    private readonly businessLocationServiceRepository: BusinessLocationServiceRepository,
  ) {}

  execute(
    businessId: string,
    locationId: string,
    command: AddServiceToLocationCommand,
  ): Promise<BusinessLocationService> {
    return this.businessLocationServiceRepository.add(businessId, locationId, command);
  }
}
