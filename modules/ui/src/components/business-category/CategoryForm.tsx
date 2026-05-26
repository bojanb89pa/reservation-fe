import { useState, useEffect } from 'react';
import type { BusinessCategory } from '@domain';
import styles from './CategoryForm.module.css';

interface Props {
  categories: BusinessCategory[];
  initial?: BusinessCategory;
  onSave: (name: string, parentId: string | null) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

export function CategoryForm({ categories, initial, onSave, onCancel, isPending, error }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [parentId, setParentId] = useState<string>(initial?.parentId ?? '');

  useEffect(() => {
    setName(initial?.name ?? '');
    setParentId(initial?.parentId ?? '');
  }, [initial]);

  const topLevel = categories.filter((c) => c.parentId === null && c.id !== initial?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave(name.trim(), parentId || null);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className="error-box">{error}</div>}
      <div className="form-field">
        <label className="form-label">Name</label>
        <input
          className="form-input"
          placeholder="e.g. Beauty"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="form-field">
        <label className="form-label">Parent category</label>
        <select
          className="form-input"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">— Top-level —</option>
          {topLevel.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending ? 'Saving…' : initial ? 'Save changes' : 'Create category'}
        </button>
      </div>
    </form>
  );
}
