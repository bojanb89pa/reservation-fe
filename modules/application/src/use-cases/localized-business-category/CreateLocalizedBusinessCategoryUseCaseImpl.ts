import type {
  LocalizedBusinessCategoryRepository,
  CreateLocalizedBusinessCategoryUseCase,
  LocalizedBusinessCategory,
  CreateLocalizedBusinessCategoryCommand,
} from '@domain';

export class CreateLocalizedBusinessCategoryUseCaseImpl implements CreateLocalizedBusinessCategoryUseCase {
  constructor(
    private readonly localizedBusinessCategoryRepository: LocalizedBusinessCategoryRepository,
  ) {}

  execute(command: CreateLocalizedBusinessCategoryCommand): Promise<LocalizedBusinessCategory> {
    return this.localizedBusinessCategoryRepository.create(command);
  }
}
