import { Link } from 'react-router-dom';
import { useMyBusinesses } from '../../hooks/useBusinesses';
import styles from './DashboardMyBusinessesPage.module.css';

export function DashboardMyBusinessesPage() {
  const { data, isLoading } = useMyBusinesses(0, 20);

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>Dashboard</div>
          <h1 className={styles.pageTitle}>My businesses</h1>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Businesses you belong to</h2>
          <span className={styles.sectionMeta}>{data?.totalElements ?? 0} total</span>
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

          {!isLoading && data?.content.length === 0 && (
            <div className={styles.emptyState}>You are not a member of any business yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
