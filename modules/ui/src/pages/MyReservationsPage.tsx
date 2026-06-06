import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useGetAllReservations } from '../hooks/useReservations';
import { ReservationList } from '../components/reservation/ReservationList';
import styles from './MyReservationsPage.module.css';

export function MyReservationsPage() {
  const { isAuthenticated, initiateLogin } = useAuth();
  const { t } = useTranslation();
  const { data: reservations = [], isLoading, isError } = useGetAllReservations();

  useEffect(() => {
    if (!isAuthenticated) initiateLogin();
  }, [isAuthenticated, initiateLogin]);

  if (!isAuthenticated) return null;

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.eyebrow}>{t('myReservations.eyebrow')}</div>
        <h1 className={styles.title}>{t('myReservations.title')}</h1>
      </div>

      {isLoading && (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      )}

      {isError && <div className="error-box">{t('myReservations.error')}</div>}

      {!isLoading && !isError && <ReservationList reservations={reservations} />}
    </div>
  );
}
