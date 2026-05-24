import type { BusinessContactInfo } from '../../entities/BusinessContactInfo';

export interface ListContactInfoUseCase {
  execute(businessId: string): Promise<BusinessContactInfo[]>;
}
