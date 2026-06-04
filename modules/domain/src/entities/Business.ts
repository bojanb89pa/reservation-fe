import type { CreateBusinessLocationCommand } from './BusinessLocation';
import type { BusinessCategory } from './BusinessCategory';

export type BusinessStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DELETED';

export interface Business {
  id: string | null;
  name: string;
  status: BusinessStatus;
  ownerId: string | null;
  categoryId: string | null;
  category: BusinessCategory | null;
}

export interface SubmitBusinessCommand {
  name: string;
  location: CreateBusinessLocationCommand;
}

export interface CreateBusinessByAdminCommand {
  name: string;
  ownerId: string;
  location: CreateBusinessLocationCommand;
}

export interface SetBusinessCategoryCommand {
  categoryId: string | null;
}
