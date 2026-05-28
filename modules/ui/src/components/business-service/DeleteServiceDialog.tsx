import { useTranslation, Trans } from 'react-i18next';
import type { BusinessService } from '@domain';
import styles from './DeleteServiceDialog.module.css';

interface Props {
  service: BusinessService;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

export function DeleteServiceDialog({ service, onConfirm, onCancel, isPending, error }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h3 className={styles.title}>{t('deleteServiceDialog.title')}</h3>
        <p className={styles.body}>
          <Trans
            i18nKey="deleteServiceDialog.body"
            values={{ name: service.name }}
            components={{ bold: <strong /> }}
          />
        </p>
        {error && <div className="error-box">{error}</div>}
        <div className={styles.actions}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isPending}>
            {t('deleteServiceDialog.cancel')}
          </button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? t('deleteServiceDialog.deleting') : t('deleteServiceDialog.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
