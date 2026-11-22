import type { Business } from '../../entities/Business';

export interface SetCancellationDeadlineUseCase {
  execute(id: string, minNoticeMinutes: number): Promise<Business>;
}
