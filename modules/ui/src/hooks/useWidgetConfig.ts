import { useQuery } from '@tanstack/react-query';
import { getWidgetConfigUseCase } from '../app/container';

export const widgetConfigKeys = {
  byClient: (clientApplicationId: string) => ['widget-config', clientApplicationId] as const,
};

export function useWidgetConfig(clientApplicationId: string) {
  return useQuery({
    queryKey: widgetConfigKeys.byClient(clientApplicationId),
    queryFn: () => getWidgetConfigUseCase.execute(clientApplicationId),
    enabled: !!clientApplicationId,
    // An unknown partner (404) or a disabled one will not fix itself on a retry.
    retry: false,
  });
}
