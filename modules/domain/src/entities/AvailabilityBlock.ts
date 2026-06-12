import type { ResourceSlotStatus } from './ResourceSlot';

/**
 * A contiguous run of availability for a DAYS-based service.
 * `endTime` is exclusive (a 1-day block is start day 00:00 → next day 00:00).
 * Days outside availability are simply absent from the list.
 */
export interface AvailabilityBlock {
  startTime: string;
  endTime: string;
  status: ResourceSlotStatus;
}
