import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessErrorCode } from '@domain';
import type { Business } from '@domain';
import { useCurrentUserId } from '../../hooks/useCurrentRoles';
import { useUpdateOverlappingPendingSetting } from '../../hooks/useUpdateOverlappingPendingSetting';
import styles from './BusinessImageSection.module.css';

interface Props {
  business: Business;
}

function isOwnerRequiredError(err: unknown): boolean {
  return (
    err instanceof Error &&
    ((err as { code?: string }).code === BusinessErrorCode.OWNER_REQUIRED ||
      err.message === BusinessErrorCode.OWNER_REQUIRED)
  );
}

/** Owner-only switch; non-owners (employees, admins) do not see the section at all. */
export function OverlappingPendingSection({ business }: Props) {
  const { t } = useTranslation();
  const userId = useCurrentUserId();
  const { mutateAsync: update, isPending } = useUpdateOverlappingPendingSetting(business.id ?? '');
  const [error, setError] = useState<string | null>(null);

  if (!userId || business.ownerId !== userId) return null;

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    try {
      await update(event.target.checked);
    } catch (err: unknown) {
      setError(
        isOwnerRequiredError(err)
          ? t('overlappingPending.errorOwnerRequired')
          : t('overlappingPending.errorGeneric'),
      );
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t('overlappingPending.sectionTitle')}</h2>
      </div>

      <label>
        <input
          type="checkbox"
          role="switch"
          checked={business.allowOverlappingPendingReservations}
          onChange={handleChange}
          disabled={isPending}
        />{' '}
        {t('overlappingPending.label')}
      </label>
      <p className={styles.sectionMeta} role="note">
        {t('overlappingPending.warning')}
      </p>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
