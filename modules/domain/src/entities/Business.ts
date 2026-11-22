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
  /** When false, a new PENDING reservation cannot overlap another PENDING one. Defaults to true on the BE. */
  allowOverlappingPendingReservations: boolean;
  /** Latest cancellation deadline in minutes before the slot starts (1..43200). null = no deadline. */
  minNoticeMinutes: number | null;
}

export const MIN_CANCELLATION_NOTICE_MINUTES = 1;
export const MAX_CANCELLATION_NOTICE_MINUTES = 43200;

export interface SetCancellationDeadlineCommand {
  /** Whole number, MIN_CANCELLATION_NOTICE_MINUTES..MAX_CANCELLATION_NOTICE_MINUTES. */
  minNoticeMinutes: number;
}

export interface UpdateOverlappingPendingSettingCommand {
  allowOverlappingPendingReservations: boolean;
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
