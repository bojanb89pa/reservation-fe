import { useTranslation, Trans } from 'react-i18next';
import type { User } from '@domain';
import styles from './DeleteUserDialog.module.css';

interface Props {
  user: User;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

export function DeleteUserDialog({ user, onConfirm, onCancel, isPending, error }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h3 className={styles.title}>{t('deleteUserDialog.title')}</h3>
        <p className={styles.body}>
          <Trans
            i18nKey="deleteUserDialog.body"
            values={{ name: `${user.firstName} ${user.lastName}` }}
            components={{ bold: <strong /> }}
          />
        </p>
        {error && <div className="error-box">{error}</div>}
        <div className={styles.actions}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isPending}>
            {t('deleteUserDialog.cancel')}
          </button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? t('deleteUserDialog.deleting') : t('deleteUserDialog.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
