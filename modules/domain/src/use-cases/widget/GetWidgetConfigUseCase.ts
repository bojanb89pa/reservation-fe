import type { WidgetConfig } from '../../entities/ClientApplicationWidget';

export interface GetWidgetConfigUseCase {
  /** Combines resource-service widget-config with the partner's public integration (`allowedOrigins`). */
  execute(clientApplicationId: string): Promise<WidgetConfig>;
}
