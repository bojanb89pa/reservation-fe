import type { AxiosInstance } from 'axios';
import type { BusinessContactInfoRepository, BusinessContactInfo, ContactInfoType } from '@domain';

export class BusinessContactInfoApiRepository implements BusinessContactInfoRepository {
  constructor(private readonly client: AxiosInstance) {}

  async add(
    businessId: string,
    type: ContactInfoType,
    value: string,
    label?: string,
  ): Promise<BusinessContactInfo> {
    const response = await this.client.post<BusinessContactInfo>(
      `/api/businesses/${businessId}/contact-info`,
      { type, value, label },
    );
    return response.data;
  }

  async list(businessId: string): Promise<BusinessContactInfo[]> {
    const response = await this.client.get<BusinessContactInfo[]>(
      `/api/businesses/${businessId}/contact-info`,
    );
    return response.data;
  }

  async remove(businessId: string, contactInfoId: string): Promise<BusinessContactInfo> {
    const response = await this.client.delete<BusinessContactInfo>(
      `/api/businesses/${businessId}/contact-info/${contactInfoId}`,
    );
    return response.data;
  }

  async update(
    businessId: string,
    contactInfoId: string,
    type: ContactInfoType,
    value: string,
    label?: string,
  ): Promise<BusinessContactInfo> {
    const response = await this.client.put<BusinessContactInfo>(
      `/api/businesses/${businessId}/contact-info/${contactInfoId}`,
      { type, value, label },
    );
    return response.data;
  }
}
