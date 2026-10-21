import type {
  ClientApplicationIntegrationRepository,
  ClientApplicationWidgetRepository,
  GetWidgetConfigUseCase,
  WidgetConfig,
} from '@fe/domain';

export class GetWidgetConfigUseCaseImpl implements GetWidgetConfigUseCase {
  constructor(
    private readonly widgetRepository: ClientApplicationWidgetRepository,
    private readonly integrationRepository: ClientApplicationIntegrationRepository,
  ) {}

  async execute(clientApplicationId: string): Promise<WidgetConfig> {
    const [config, integration] = await Promise.all([
      this.widgetRepository.getWidgetConfig(clientApplicationId),
      this.integrationRepository.getPublicIntegration(clientApplicationId),
    ]);

    return {
      clientApplicationId: config.clientApplicationId,
      allowedOrigins: integration?.allowedOrigins ?? [],
      enabled: config.enabled,
      locations: config.locations,
    };
  }
}
