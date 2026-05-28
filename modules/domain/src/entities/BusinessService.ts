export type DurationUnit = 'MINUTES' | 'HOURS' | 'DAYS';

export interface BusinessService {
  id: string;
  businessId: string;
  name: string;
  duration: number;
  durationUnit: DurationUnit;
}

export interface CreateBusinessServiceCommand {
  name: string;
  duration: number;
  durationUnit: DurationUnit;
}

export interface UpdateBusinessServiceCommand {
  name: string;
  duration: number;
  durationUnit: DurationUnit;
}
