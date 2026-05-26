import type {
  BusinessCategoryRepository,
  UpdateBusinessCategoryUseCase,
  BusinessCategory,
  UpdateBusinessCategoryCommand,
} from '@domain';

export class UpdateBusinessCategoryUseCaseImpl implements UpdateBusinessCategoryUseCase {
  constructor(private readonly businessCategoryRepository: BusinessCategoryRepository) {}

  execute(id: string, command: UpdateBusinessCategoryCommand): Promise<BusinessCategory> {
    return this.businessCategoryRepository.update(id, command);
  }
}
