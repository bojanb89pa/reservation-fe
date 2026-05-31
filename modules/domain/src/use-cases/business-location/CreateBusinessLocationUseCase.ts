import type {
  BusinessLocation,
  CreateBusinessLocationCommand,
} from '../../entities/BusinessLocation';

export interface CreateBusinessLocationUseCase {
  execute(businessId: string, command: CreateBusinessLocationCommand): Promise<BusinessLocation>;
}
