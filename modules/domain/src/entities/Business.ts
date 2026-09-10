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
  /** Relative path such as "/api/businesses/<id>/image", or null when there is no image. */
  imageUrl: string | null;
}

export interface SubmitBusinessCommand {
  name: string;
  location: CreateBusinessLocationCommand;
  /** Claims a previously uploaded file. Omitting it leaves the business without an image. */
  imageUploadId?: string | null;
}

export interface CreateBusinessByAdminCommand {
  name: string;
  ownerId: string;
  location: CreateBusinessLocationCommand;
  /** Must belong to the admin making the call, not to the future owner. */
  imageUploadId?: string | null;
}

export interface SetBusinessCategoryCommand {
  categoryId: string | null;
}

export interface SetBusinessImageCommand {
  uploadId: string;
}
