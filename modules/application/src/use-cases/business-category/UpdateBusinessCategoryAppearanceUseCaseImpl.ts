import type {
  BusinessCategoryRepository,
  UpdateBusinessCategoryAppearanceUseCase,
  BusinessCategory,
  UpdateBusinessCategoryAppearanceCommand,
} from '@domain';

export class UpdateBusinessCategoryAppearanceUseCaseImpl implements UpdateBusinessCategoryAppearanceUseCase {
  constructor(private readonly businessCategoryRepository: BusinessCategoryRepository) {}

  execute(id: string, command: UpdateBusinessCategoryAppearanceCommand): Promise<BusinessCategory> {
    return this.businessCategoryRepository.updateAppearance(id, command);
  }
}
