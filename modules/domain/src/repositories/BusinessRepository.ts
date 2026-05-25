import type {
  Business,
  SubmitBusinessCommand,
  CreateBusinessByAdminCommand,
} from '../entities/Business';
import type { PageRequest, PageResponse } from '../types/Page';

export interface BusinessRepository {
  getMyBusinesses(pageRequest: PageRequest): Promise<PageResponse<Business>>;
  search(query: string, pageRequest: PageRequest): Promise<PageResponse<Business>>;
  getById(id: string): Promise<Business>;
  create(business: Pick<Business, 'name'>): Promise<Business>;
  submit(command: SubmitBusinessCommand): Promise<Business>;
  createByAdmin(command: CreateBusinessByAdminCommand): Promise<Business>;
  activate(id: string): Promise<Business>;
  reject(id: string): Promise<Business>;
  delete(id: string): Promise<Business>;
}
