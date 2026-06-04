import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessCategory } from '@domain';
import {
  useBusinessCategories,
  useCreateBusinessCategory,
  useUpdateBusinessCategory,
  useUpdateBusinessCategoryAppearance,
  useDeleteBusinessCategory,
} from '../../hooks/useBusinessCategories';
import { CategoryTree } from '../../components/business-category/CategoryTree';
import { CategoryForm } from '../../components/business-category/CategoryForm';
import { CategoryAppearanceForm } from '../../components/business-category/CategoryAppearanceForm';
import { DeleteCategoryDialog } from '../../components/business-category/DeleteCategoryDialog';
import styles from './DashboardCategoriesPage.module.css';

type Mode =
  | { type: 'idle' }
  | { type: 'create' }
  | { type: 'edit'; category: BusinessCategory }
  | { type: 'appearance'; category: BusinessCategory }
  | { type: 'delete'; category: BusinessCategory };

export function DashboardCategoriesPage() {
  const { data: categories = [], isLoading } = useBusinessCategories();
  const { mutateAsync: create, isPending: creating } = useCreateBusinessCategory();
  const { mutateAsync: update, isPending: updating } = useUpdateBusinessCategory();
  const { mutateAsync: updateAppearance, isPending: updatingAppearance } =
    useUpdateBusinessCategoryAppearance();
  const { mutateAsync: remove, isPending: deleting } = useDeleteBusinessCategory();
  const { t } = useTranslation();

  const [mode, setMode] = useState<Mode>({ type: 'idle' });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reset = () => {
    setMode({ type: 'idle' });
    setFormError(null);
    setDeleteError(null);
  };

  const handleSave = async (
    code: string | undefined,
    translations: Record<string, string>,
    parentId: string | null,
  ) => {
    setFormError(null);
    try {
      if (mode.type === 'create') {
        await create({ code: code!, parentId: parentId ?? undefined, translations });
      } else if (mode.type === 'edit') {
        await update({
          id: mode.category.id,
          command: { code: code || undefined, parentId: parentId ?? undefined, translations },
        });
      }
      reset();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t('dashboardCategories.errorSave'));
    }
  };

  const handleSaveAppearance = async (symbol: string | null, color: string | null) => {
    if (mode.type !== 'appearance') return;
    setFormError(null);
    try {
      await updateAppearance({ id: mode.category.id, command: { symbol, color } });
      reset();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t('dashboardCategories.errorAppearance'));
    }
  };

  const handleDelete = async () => {
    if (mode.type !== 'delete') return;
    setDeleteError(null);
    try {
      await remove(mode.category.id);
      reset();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : t('dashboardCategories.errorDelete'));
    }
  };

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>{t('dashboard.eyebrow')}</div>
          <h1 className={styles.pageTitle}>{t('dashboardCategories.title')}</h1>
        </div>
        {mode.type === 'idle' && (
          <button className="btn btn-secondary" onClick={() => setMode({ type: 'create' })}>
            {t('dashboardCategories.newCategory')}
          </button>
        )}
      </div>

      {(mode.type === 'create' || mode.type === 'edit') && (
        <div className={styles.formWrap}>
          <h3 className={styles.formTitle}>
            {mode.type === 'create'
              ? t('dashboardCategories.addCategory')
              : t('dashboardCategories.editCategory')}
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

      {mode.type === 'appearance' && (
        <div className={styles.formWrap}>
          <h3 className={styles.formTitle}>{t('dashboardCategories.editAppearance')}</h3>
          <CategoryAppearanceForm
            category={mode.category}
            onSave={handleSaveAppearance}
            onCancel={reset}
            isPending={updatingAppearance}
            error={formError}
          />
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('dashboardCategories.allCategories')}</h2>
          <span className={styles.sectionMeta}>
            {t('dashboardCategories.total', { count: categories.length })}
          </span>
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
            onEditAppearance={(c) => {
              setFormError(null);
              setMode({ type: 'appearance', category: c });
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
