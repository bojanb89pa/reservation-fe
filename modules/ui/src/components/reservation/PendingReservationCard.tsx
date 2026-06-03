import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { Reservation } from '@domain';
import { useApproveReservation, useRejectReservation } from '../../hooks/useReservations';
import styles from './PendingReservationCard.module.css';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  reservation: Reservation;
}

export function PendingReservationCard({ reservation }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { mutate: approve, isPending: approving, error: approveError } = useApproveReservation();
  const { mutate: reject, isPending: rejecting, error: rejectError } = useRejectReservation();

  const isPending = reservation.status === 'PENDING_APPROVAL';
  const busy = approving || rejecting;
  const error = approveError ?? rejectError;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['reservations', reservation.id] });

  const handleApprove = () =>
    approve({ resourceId: reservation.resourceId, id: reservation.id! }, { onSuccess: invalidate });

  const handleReject = () =>
    reject({ resourceId: reservation.resourceId, id: reservation.id! }, { onSuccess: invalidate });

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={`${styles.badge} ${styles[reservation.status]}`}>
          {t(`reservationStatus.${reservation.status}`)}
        </span>
      </div>

      <dl className={styles.details}>
        <div className={styles.row}>
          <dt className={styles.label}>{t('reservationCard.start')}</dt>
          <dd className={styles.value}>{formatDateTime(reservation.startTime)}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>{t('reservationCard.end')}</dt>
          <dd className={styles.value}>{formatDateTime(reservation.endTime)}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>{t('reservationCard.serviceId')}</dt>
          <dd className={`${styles.value} ${styles.mono}`}>{reservation.serviceId}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>{t('reservationCard.reservationId')}</dt>
          <dd className={`${styles.value} ${styles.mono}`}>{reservation.id}</dd>
        </div>
      </dl>

      {isPending && (
        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={handleApprove} disabled={busy}>
            {approving ? t('reservationCard.approving') : t('reservationCard.approve')}
          </button>
          <button className="btn btn-ghost" onClick={handleReject} disabled={busy}>
            {rejecting ? t('reservationCard.rejecting') : t('reservationCard.reject')}
          </button>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error instanceof Error ? error.message : t('reservationCard.actionError')}
        </div>
      )}
    </div>
  );
}
