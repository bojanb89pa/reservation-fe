import type { ClientApplicationDetail } from '../../entities/ClientApplication';

export interface GetClientApplicationUseCase {
  execute(id: string): Promise<ClientApplicationDetail>;
}
