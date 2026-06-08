export type ResourceSlotStatus = 'AVAILABLE' | 'PENDING' | 'CONFIRMED';

export interface ResourceSlot {
  startTime: string;
  endTime: string;
  status: ResourceSlotStatus;
}
