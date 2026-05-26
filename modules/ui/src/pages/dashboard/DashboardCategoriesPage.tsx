import { useState } from 'react';
import type { BusinessCategory } from '@domain';
import {
  useBusinessCategories,
  useCreateBusinessCategory,
  useUpdateBusinessCategory,
  useDeleteBusinessCategory,
} from '../../hooks/useBusinessCategories';
import { CategoryTree } from '../../components/business-category/CategoryTree';
import { CategoryForm } from '../../components/business-category/CategoryForm';
import { DeleteCategoryDialog } from '../../components/business-category/DeleteCategoryDialog';
import styles from './DashboardCategoriesPage.module.css';

type Mode =
  | { type: 'idle' }
  | { type: 'create' }
  | { type: 'edit'; category: BusinessCategory }
  | { type: 'delete'; category: BusinessCategory };

export function DashboardCategoriesPage() {
  const { data: categories = [], isLoading } = useBusinessCategories();
  const { mutateAsync: create, isPending: creating } = useCreateBusinessCategory();
  const { mutateAsync: update, isPending: updating } = useUpdateBusinessCategory();
  const { mutateAsync: remove, isPending: deleting } = useDeleteBusinessCategory();

  const [mode, setMode] = useState<Mode>({ type: 'idle' });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reset = () => {
    setMode({ type: 'idle' });
    setFormError(null);
    setDeleteError(null);
  };

  const handleSave = async (name: string, parentId: string | null) => {
    setFormError(null);
    try {
      if (mode.type === 'create') {
        await create({ name, parentId: parentId ?? undefined });
      } else if (mode.type === 'edit') {
        await update({ id: mode.category.id, command: { name, parentId: parentId ?? undefined } });
      }
      reset();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save category');
    }
  };

  const handleDelete = async () => {
    if (mode.type !== 'delete') return;
    setDeleteError(null);
    try {
      await remove(mode.category.id);
      reset();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>Dashboard</div>
          <h1 className={styles.pageTitle}>Business categories</h1>
        </div>
        {mode.type === 'idle' && (
          <button className="btn btn-primary" onClick={() => setMode({ type: 'create' })}>
            + New category
          </button>
        )}
      </div>

      {(mode.type === 'create' || mode.type === 'edit') && (
        <div className={styles.formWrap}>
          <h3 className={styles.formTitle}>
            {mode.type === 'create' ? 'Add a category' : 'Edit category'}
          </h3>
          <CategoryForm
            categories={categories}
            initial={mode.type === 'edit' ? mode.category : undefined}
            onSave={handleSave}
            onCancel={reset}
            isPending={creating || updating}
            error={formError}
          />
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>All categories</h2>
          <span className={styles.sectionMeta}>{categories.length} total</span>
        </div>

        {isLoading && (
          <div className="page-loading">
            <div className="spinner" />
          </div>
        )}

        {!isLoading && (
          <CategoryTree
            categories={categories}
            onEdit={(c) => {
              setFormError(null);
              setMode({ type: 'edit', category: c });
            }}
            onDelete={(c) => {
              setDeleteError(null);
              setMode({ type: 'delete', category: c });
            }}
          />
        )}
      </section>

      {mode.type === 'delete' && (
        <DeleteCategoryDialog
          category={mode.category}
          onConfirm={handleDelete}
          onCancel={reset}
          isPending={deleting}
          error={deleteError}
        />
      )}
    </div>
  );
}
