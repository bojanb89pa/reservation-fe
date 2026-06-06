import type { BusinessLocation } from '../../entities/BusinessLocation';

export interface ConfirmLocationUseCase {
  execute(businessId: string, locationId: string): Promise<BusinessLocation>;
}
