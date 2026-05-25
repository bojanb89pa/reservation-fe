export type BusinessStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DELETED';

export interface Business {
  id: string | null;
  name: string;
  status: BusinessStatus;
  ownerId: string | null;
}

export interface CreateBusinessCommand {
  name: string;
}

export interface SubmitBusinessCommand {
  name: string;
}

export interface CreateBusinessByAdminCommand {
  name: string;
  ownerId: string;
}
