import type { Business } from '../../entities/Business';

export interface UpdateOverlappingPendingSettingUseCase {
  execute(id: string, allowOverlappingPendingReservations: boolean): Promise<Business>;
}
