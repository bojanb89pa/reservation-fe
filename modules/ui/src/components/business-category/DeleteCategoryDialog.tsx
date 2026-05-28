import { useTranslation, Trans } from 'react-i18next';
import type { BusinessCategory } from '@domain';
import styles from './DeleteCategoryDialog.module.css';

interface Props {
  category: BusinessCategory;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

export function DeleteCategoryDialog({ category, onConfirm, onCancel, isPending, error }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h3 className={styles.title}>{t('deleteCategoryDialog.title')}</h3>
        <p className={styles.body}>
          <Trans
            i18nKey="deleteCategoryDialog.body"
            values={{ name: category.name }}
            components={{ bold: <strong /> }}
          />
        </p>
        {error && <div className="error-box">{error}</div>}
        <div className={styles.actions}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isPending}>
            {t('deleteCategoryDialog.cancel')}
          </button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? t('deleteCategoryDialog.deleting') : t('deleteCategoryDialog.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
