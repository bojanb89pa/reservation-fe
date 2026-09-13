import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { NotFoundError, UnauthorizedError } from '@domain';

/**
 * NotFoundError/UnauthorizedError carry a hardcoded English message from the domain
 * constructor, so they route through i18n; ValidationError/ConflictError already carry
 * the backend's specific reason (e.g. duplicate email) and are shown as-is.
 */
export function useAdminUserMessages() {
  const { t } = useTranslation();

  const errorMessage = useCallback(
    (error: unknown): string => {
      if (error instanceof NotFoundError) return t('adminUsers.errorNotFound');
      if (error instanceof UnauthorizedError) return t('adminUsers.errorForbidden');
      if (error instanceof Error && error.message) return error.message;
      return t('adminUsers.errorGeneric');
    },
    [t],
  );

  return { errorMessage };
}
