import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMyBusinesses } from '../../hooks/useBusinesses';
import styles from './DashboardOverviewPage.module.css';

export function DashboardOverviewPage() {
  const { data, isLoading } = useMyBusinesses(0, 4);
  const { t } = useTranslation();

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>{t('dashboard.eyebrow')}</div>
          <h1 className={styles.pageTitle}>{t('dashboardOverview.title')}</h1>
        </div>
        <div className={styles.topbarRight}>
          <Link to="/dashboard/businesses/new" className="btn btn-primary">
            {t('dashboardOverview.newBusiness')}
          </Link>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>{t('dashboardOverview.statBusinesses')}</div>
          <div className={styles.statValue}>{data?.totalElements ?? '—'}</div>
          <div className={styles.statTrend}>{t('dashboardOverview.statRegistered')}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>{t('dashboardOverview.statResources')}</div>
          <div className={styles.statValue}>—</div>
          <div className={styles.statTrend}>{t('dashboardOverview.statResourcesTrend')}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>{t('dashboardOverview.statReservations')}</div>
          <div className={styles.statValue}>—</div>
          <div className={styles.statTrend}>{t('dashboardOverview.statReservationsTrend')}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>{t('dashboardOverview.statMonth')}</div>
          <div className={styles.statValue}>—</div>
          <div className={styles.statTrend}>{t('dashboardOverview.statMonthTrend')}</div>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('dashboardOverview.yourBusinesses')}</h2>
          <Link to="/dashboard/businesses" className={styles.sectionLink}>
            {t('dashboardOverview.seeAll')}
          </Link>
        </div>

        {isLoading && (
          <div className="page-loading">
            <div className="spinner" />
          </div>
        )}

        {data?.content.length === 0 && (
          <div className={styles.emptyState}>
            <p>{t('dashboardOverview.noBusinessYet')}</p>
            <Link
              to="/dashboard/businesses/new"
              className="btn btn-primary"
              style={{ marginTop: 12 }}
            >
              {t('dashboardOverview.addFirstBusiness')}
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
