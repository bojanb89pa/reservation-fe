import type {
  BusinessService,
  CreateBusinessServiceCommand,
  UpdateBusinessServiceCommand,
} from '../entities/BusinessService';

export interface BusinessServiceRepository {
  create(businessId: string, command: CreateBusinessServiceCommand): Promise<BusinessService>;
  list(businessId: string): Promise<BusinessService[]>;
  getById(businessId: string, serviceId: string): Promise<BusinessService>;
  update(
    businessId: string,
    serviceId: string,
    command: UpdateBusinessServiceCommand,
  ): Promise<BusinessService>;
  delete(businessId: string, serviceId: string): Promise<BusinessService>;
}
