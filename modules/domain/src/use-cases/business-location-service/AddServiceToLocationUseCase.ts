import type {
  BusinessLocationService,
  AddServiceToLocationCommand,
} from '../../entities/BusinessLocationService';

export interface AddServiceToLocationUseCase {
  execute(
    businessId: string,
    locationId: string,
    command: AddServiceToLocationCommand,
  ): Promise<BusinessLocationService>;
}
