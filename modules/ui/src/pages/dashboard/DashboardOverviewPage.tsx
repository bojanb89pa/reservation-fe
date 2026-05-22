import { Link } from 'react-router-dom';
import { useBusinesses } from '../../hooks/useBusinesses';
import styles from './DashboardOverviewPage.module.css';

export function DashboardOverviewPage() {
  const { data, isLoading } = useBusinesses(0, 4);

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>Dashboard</div>
          <h1 className={styles.pageTitle}>Overview</h1>
        </div>
        <div className={styles.topbarRight}>
          <Link to="/dashboard/businesses/new" className="btn btn-primary">
            + New business
          </Link>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Businesses</div>
          <div className={styles.statValue}>{data?.totalElements ?? '—'}</div>
          <div className={styles.statTrend}>registered</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Total resources</div>
          <div className={styles.statValue}>—</div>
          <div className={styles.statTrend}>across all businesses</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Open reservations</div>
          <div className={styles.statValue}>—</div>
          <div className={styles.statTrend}>pending your reply</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>This month</div>
          <div className={styles.statValue}>—</div>
          <div className={styles.statTrend}>bookings total</div>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Your businesses</h2>
          <Link to="/dashboard/businesses" className={styles.sectionLink}>
            See all
          </Link>
        </div>

        {isLoading && (
          <div className="page-loading">
            <div className="spinner" />
          </div>
        )}

        {data?.content.length === 0 && (
          <div className={styles.emptyState}>
            <p>You haven't added a business yet.</p>
            <Link
              to="/dashboard/businesses/new"
              className="btn btn-primary"
              style={{ marginTop: 12 }}
            >
              Add your first business
            </Link>
          </div>
        )}

        <div className={styles.bizList}>
          {data?.content.map((b) => (
            <Link key={b.id} to={`/dashboard/businesses/${b.id}`} className={styles.bizRow}>
              <span className={styles.bizName}>{b.name}</span>
              <span className={styles.bizArrow}>→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
