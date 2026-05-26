import type {
  BusinessCategoryRepository,
  CreateBusinessCategoryUseCase,
  BusinessCategory,
  CreateBusinessCategoryCommand,
} from '@domain';

export class CreateBusinessCategoryUseCaseImpl implements CreateBusinessCategoryUseCase {
  constructor(private readonly businessCategoryRepository: BusinessCategoryRepository) {}

  execute(command: CreateBusinessCategoryCommand): Promise<BusinessCategory> {
    return this.businessCategoryRepository.create(command);
  }
}
