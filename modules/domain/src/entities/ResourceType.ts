export type ResourceType = 'EMPLOYEE' | 'ROOM' | 'APARTMENT' | 'TABLE' | 'COURT' | 'VEHICLE';

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  EMPLOYEE: 'Employee',
  ROOM: 'Room',
  APARTMENT: 'Apartment',
  TABLE: 'Table',
  COURT: 'Court',
  VEHICLE: 'Vehicle',
};
