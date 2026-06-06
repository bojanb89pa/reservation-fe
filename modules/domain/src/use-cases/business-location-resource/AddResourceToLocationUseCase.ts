import type {
  BusinessLocationResource,
  AddResourceToLocationCommand,
} from '../../entities/BusinessLocationResource';

export interface AddResourceToLocationUseCase {
  execute(
    businessId: string,
    locationId: string,
    command: AddResourceToLocationCommand,
  ): Promise<BusinessLocationResource>;
}
