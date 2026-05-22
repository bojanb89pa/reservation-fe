import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusinesses, useCreateBusiness } from '../../hooks/useBusinesses';
import styles from './DashboardBusinessesPage.module.css';

export function DashboardBusinessesPage() {
  const { data, isLoading } = useBusinesses(0, 50);
  const { mutateAsync: createBusiness, isPending } = useCreateBusiness();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await createBusiness(name.trim());
      setName('');
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create business');
    }
  };

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>Dashboard</div>
          <h1 className={styles.pageTitle}>My businesses</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New business'}
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>Add a business</h3>
          {error && (
            <div className="error-box" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className={styles.form}>
            <div className="form-field">
              <label className="form-label">Business name</label>
              <input
                className="form-input"
                placeholder="e.g. Maison Kohl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create business'}
            </button>
          </form>
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>All businesses</h2>
          <span className={styles.sectionMeta}>{data?.totalElements ?? 0} registered</span>
        </div>

        {isLoading && (
          <div className="page-loading">
            <div className="spinner" />
          </div>
        )}

        <div className={styles.bizList}>
          {data?.content.map((b) => (
            <Link key={b.id} to={`/dashboard/businesses/${b.id}`} className={styles.bizRow}>
              <div className={styles.bizInfo}>
                <span className={styles.bizName}>{b.name}</span>
                <span className={styles.bizId} title={b.id ?? ''}>
                  {b.id?.slice(0, 8)}…
                </span>
              </div>
              <span className={styles.bizArrow}>Manage →</span>
            </Link>
          ))}

          {data?.content.length === 0 && (
            <div
              style={{ padding: '28px 20px', color: 'var(--ink-500)', fontSize: 'var(--text-sm)' }}
            >
              No businesses yet. Add your first one above.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
