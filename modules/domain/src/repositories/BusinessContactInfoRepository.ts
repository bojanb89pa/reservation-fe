import type { BusinessContactInfo, ContactInfoType } from '../entities/BusinessContactInfo';

export interface BusinessContactInfoRepository {
  add(
    businessId: string,
    type: ContactInfoType,
    value: string,
    label?: string,
  ): Promise<BusinessContactInfo>;
  list(businessId: string): Promise<BusinessContactInfo[]>;
  remove(businessId: string, contactInfoId: string): Promise<BusinessContactInfo>;
  update(
    businessId: string,
    contactInfoId: string,
    type: ContactInfoType,
    value: string,
    label?: string,
  ): Promise<BusinessContactInfo>;
}
