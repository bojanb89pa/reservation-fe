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
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h3 className={styles.title}>Delete category</h3>
        <p className={styles.body}>
          Delete <strong>{category.name}</strong>? This cannot be undone.
        </p>
        {error && <div className="error-box">{error}</div>}
        <div className={styles.actions}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
