import { useTranslation } from 'react-i18next';
import type { ClientApplicationScope } from '@fe/domain';

function scopeDetail(scope: ClientApplicationScope): string {
  switch (scope.type) {
    case 'SINGLE_LOCATION':
      return scope.locationId;
    case 'MULTIPLE_LOCATIONS':
      return `${scope.businessId}: ${scope.locationIds.join(', ')}`;
    case 'LOCATION_LIST':
      return scope.locationIds.join(', ');
    case 'CATEGORY':
      return scope.categoryId;
  }
}

interface Props {
  scope: ClientApplicationScope;
}

export function ClientApplicationScopeSummary({ scope }: Props) {
  const { t } = useTranslation();
  return (
    <span>
      {t(`clientApplicationForm.scopeType_${scope.type}`)}
      {': '}
      {scopeDetail(scope)}
    </span>
  );
}
