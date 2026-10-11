import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Translates a rejected name update. The HTTP status is what we branch on —
 * the raw backend/axios message never reaches the user.
 */
// WARNING: infrastructure returns a plain ApiError with `status` for this route, so the status is read structurally — verify before merging
export function useProfileNameMessages() {
  const { t } = useTranslation();

  return useCallback(
    (error: unknown): string => {
      const status = (error as { status?: unknown } | null)?.status;
      switch (status) {
        case 400:
          return t('profileName.errorValidation');
        case 401:
          return t('profileName.errorUnauthorized');
        case 404:
          return t('profileName.errorNotFound');
        case 422:
          return t('profileName.errorRejected');
        default:
          return t('profileName.errorGeneric');
      }
    },
    [t],
  );
}
