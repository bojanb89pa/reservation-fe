import { useTranslation } from 'react-i18next';
import { useGetAllReservations } from '../../hooks/useReservations';
import { useIsAdmin } from '../../hooks/useCurrentRoles';
import { ErrorState } from '../../components/ErrorState';
import { ReservationList } from '../../components/reservation/ReservationList';
import styles from './DashboardReservationsPage.module.css';

export function DashboardReservationsPage() {
  const { t } = useTranslation();
  const {
    data: reservations = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useGetAllReservations();
  const isAdmin = useIsAdmin();

  return (
    <div>
      <div className={styles.topbar}>
        <h1 className={styles.pageTitle}>{t('dashboardReservations.title')}</h1>
        <span className={styles.count}>{reservations.length}</span>
      </div>

      {isLoading && (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      )}

      {isError && (
        <ErrorState
          message={t('dashboardReservations.error')}
          onRetry={refetch}
          isRetrying={isRefetching}
        />
      )}

      {!isLoading && !isError && (
        <ReservationList reservations={reservations} showUserId={isAdmin} showActions />
      )}
    </div>
  );
}
