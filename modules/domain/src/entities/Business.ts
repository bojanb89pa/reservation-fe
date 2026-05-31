import type { CreateBusinessLocationCommand } from './BusinessLocation';

export type BusinessStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DELETED';

export interface Business {
  id: string | null;
  name: string;
  status: BusinessStatus;
  ownerId: string | null;
  categoryId: string | null;
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
