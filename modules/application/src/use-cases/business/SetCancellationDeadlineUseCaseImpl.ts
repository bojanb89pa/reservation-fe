import {
  MAX_CANCELLATION_NOTICE_MINUTES,
  MIN_CANCELLATION_NOTICE_MINUTES,
  ValidationError,
} from '@fe/domain';
import type { BusinessRepository, SetCancellationDeadlineUseCase, Business } from '@fe/domain';

export class SetCancellationDeadlineUseCaseImpl implements SetCancellationDeadlineUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(id: string, minNoticeMinutes: number): Promise<Business> {
    if (
      !Number.isInteger(minNoticeMinutes) ||
      minNoticeMinutes < MIN_CANCELLATION_NOTICE_MINUTES ||
      minNoticeMinutes > MAX_CANCELLATION_NOTICE_MINUTES
    ) {
      return Promise.reject(
        new ValidationError(
          `minNoticeMinutes must be a whole number between ${MIN_CANCELLATION_NOTICE_MINUTES} and ${MAX_CANCELLATION_NOTICE_MINUTES}`,
          'minNoticeMinutes',
        ),
      );
    }

    return this.businessRepository.setCancellationDeadline(id, { minNoticeMinutes });
  }
}
