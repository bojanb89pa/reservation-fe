import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetReservation } from '../../hooks/useReservations';
import { PendingReservationCard } from '../../components/reservation/PendingReservationCard';
import styles from './DashboardReservationsPage.module.css';

export function DashboardReservationsPage() {
  const { t } = useTranslation();
  const [inputId, setInputId] = useState('');
  const [activeId, setActiveId] = useState('');

  const { data: reservation, isLoading, isError } = useGetReservation(activeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputId.trim();
    if (trimmed) setActiveId(trimmed);
  };

  return (
    <div>
      <div className={styles.topbar}>
        <h1 className={styles.pageTitle}>{t('dashboardReservations.title')}</h1>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('dashboardReservations.lookupTitle')}</h2>
        </div>
        <form onSubmit={handleSubmit} className={styles.lookupForm}>
          <input
            className={`form-input ${styles.lookupInput}`}
            placeholder={t('dashboardReservations.idPlaceholder')}
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            {t('dashboardReservations.lookup')}
          </button>
        </form>
      </section>

      {isLoading && (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      )}
      {isError && activeId && (
        <div className="error-box">{t('dashboardReservations.notFound')}</div>
      )}
      {reservation && <PendingReservationCard reservation={reservation} />}
    </div>
  );
}
