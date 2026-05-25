import type {
  BusinessRepository,
  CreateBusinessByAdminUseCase,
  CreateBusinessByAdminCommand,
  Business,
} from '@domain';

export class CreateBusinessByAdminUseCaseImpl implements CreateBusinessByAdminUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(command: CreateBusinessByAdminCommand): Promise<Business> {
    return this.businessRepository.createByAdmin(command);
  }
}
