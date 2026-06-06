import type {
  Business,
  SubmitBusinessCommand,
  CreateBusinessByAdminCommand,
  SetBusinessCategoryCommand,
} from '../entities/Business';
import type { PageRequest, PageResponse } from '../types/Page';
import type { BusinessSearchFilter } from '../types/BusinessSearchFilter';

export interface BusinessRepository {
  getMyBusinesses(pageRequest: PageRequest): Promise<PageResponse<Business>>;
  getAllForAdmin(pageRequest: PageRequest): Promise<PageResponse<Business>>;
  search(filter: BusinessSearchFilter, pageRequest: PageRequest): Promise<PageResponse<Business>>;
  getByCategory(categoryId: string, pageRequest: PageRequest): Promise<PageResponse<Business>>;
  getById(id: string): Promise<Business>;
  submit(command: SubmitBusinessCommand): Promise<Business>;
  createByAdmin(command: CreateBusinessByAdminCommand): Promise<Business>;
  activate(id: string): Promise<Business>;
  reject(id: string): Promise<Business>;
  delete(id: string): Promise<Business>;
  setCategory(id: string, command: SetBusinessCategoryCommand): Promise<Business>;
}
