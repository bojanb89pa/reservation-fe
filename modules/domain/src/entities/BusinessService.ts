export type DurationUnit = 'MINUTES' | 'HOURS' | 'DAYS';

export interface BusinessService {
  id: string;
  businessId: string;
  name: string;
  minDuration: number;
  maxDuration: number;
  durationUnit: DurationUnit;
  durationStep: number;
  /** Convenience flag from the BE: true when minDuration === maxDuration. */
  fixedDuration: boolean;
}

export interface CreateBusinessServiceCommand {
  name: string;
  minDuration: number;
  maxDuration: number;
  durationUnit: DurationUnit;
  durationStep: number;
}

export interface UpdateBusinessServiceCommand {
  name: string;
  minDuration: number;
  maxDuration: number;
  durationUnit: DurationUnit;
  durationStep: number;
}
