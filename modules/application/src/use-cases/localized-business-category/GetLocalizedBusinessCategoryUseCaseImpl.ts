import type {
  LocalizedBusinessCategoryRepository,
  GetLocalizedBusinessCategoryUseCase,
  LocalizedBusinessCategory,
} from '@domain';

export class GetLocalizedBusinessCategoryUseCaseImpl implements GetLocalizedBusinessCategoryUseCase {
  constructor(
    private readonly localizedBusinessCategoryRepository: LocalizedBusinessCategoryRepository,
  ) {}

  execute(id: string): Promise<LocalizedBusinessCategory> {
    return this.localizedBusinessCategoryRepository.get(id);
  }
}
