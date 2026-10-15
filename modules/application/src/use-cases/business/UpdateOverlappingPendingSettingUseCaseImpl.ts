import type { BusinessRepository, UpdateOverlappingPendingSettingUseCase, Business } from '@fe/domain';

export class UpdateOverlappingPendingSettingUseCaseImpl implements UpdateOverlappingPendingSettingUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string, allowOverlappingPendingReservations: boolean): Promise<Business> {
    return this.businessRepository.updateOverlappingPendingSetting(id, {
      allowOverlappingPendingReservations,
    });
  }
}
