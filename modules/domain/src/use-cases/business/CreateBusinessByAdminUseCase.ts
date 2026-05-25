import type { Business, CreateBusinessByAdminCommand } from '../../entities/Business';

export interface CreateBusinessByAdminUseCase {
  execute(command: CreateBusinessByAdminCommand): Promise<Business>;
}
