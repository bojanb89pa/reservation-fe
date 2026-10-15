import type {
  LocalizedBusinessCategoryRepository,
  UpdateLocalizedBusinessCategoryUseCase,
  LocalizedBusinessCategory,
  UpdateLocalizedBusinessCategoryCommand,
} from '@fe/domain';

export class UpdateLocalizedBusinessCategoryUseCaseImpl implements UpdateLocalizedBusinessCategoryUseCase {
  constructor(
    private readonly localizedBusinessCategoryRepository: LocalizedBusinessCategoryRepository,
  ) {}

  execute(
    id: string,
    command: UpdateLocalizedBusinessCategoryCommand,
  ): Promise<LocalizedBusinessCategory> {
    return this.localizedBusinessCategoryRepository.update(id, command);
  }
}
