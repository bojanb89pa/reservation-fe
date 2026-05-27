import { useState, useEffect } from 'react';
import type { Business } from '@domain';
import { useBusinessCategories } from '../../hooks/useBusinessCategories';
import { useSetBusinessCategory } from '../../hooks/useBusinesses';
import styles from './BusinessCategorySection.module.css';

interface Props {
  business: Business;
}

export function BusinessCategorySection({ business }: Props) {
  const { data: categories = [] } = useBusinessCategories();
  const { mutateAsync: setCategory, isPending, error } = useSetBusinessCategory(business.id!);
  const [selectedId, setSelectedId] = useState<string | null>(business.categoryId ?? null);

  useEffect(() => {
    setSelectedId(business.categoryId ?? null);
  }, [business.categoryId]);

  const isDirty = selectedId !== (business.categoryId ?? null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setCategory(selectedId);
  };

  const currentName = categories.find((c) => c.id === business.categoryId)?.name ?? 'Others';

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Category</h2>
        <span className={styles.sectionMeta}>{currentName}</span>
      </div>

      <form onSubmit={handleSave} className={styles.form}>
        <select
          className="form-input"
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value || null)}
        >
          <option value="">Others (no category)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary" disabled={isPending || !isDirty}>
          Save
        </button>
      </form>

      {error && (
        <div className={styles.error}>
          {error instanceof Error ? error.message : 'Failed to update category.'}
        </div>
      )}
    </section>
  );
}
