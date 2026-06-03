import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { Reservation } from '@domain';
import { useApproveReservation, useRejectReservation } from '../../hooks/useReservations';
import styles from './ReservationListItem.module.css';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(id: string) {
  return `${id.slice(0, 8)}…`;
}

interface Props {
  reservation: Reservation;
  showUserId?: boolean;
}

export function ReservationListItem({ reservation, showUserId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { mutate: approve, isPending: approving, error: approveError } = useApproveReservation();
  const { mutate: reject, isPending: rejecting, error: rejectError } = useRejectReservation();

  const isPending = reservation.status === 'PENDING_APPROVAL';
  const busy = approving || rejecting;
  const error = approveError ?? rejectError;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reservations'] });

  const handleApprove = () =>
    approve({ resourceId: reservation.resourceId, id: reservation.id! }, { onSuccess: invalidate });

  const handleReject = () =>
    reject({ resourceId: reservation.resourceId, id: reservation.id! }, { onSuccess: invalidate });

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <span className={`${styles.badge} ${styles[reservation.status]}`}>
          {t(`reservationStatus.${reservation.status}`)}
        </span>
        <span className={styles.dates}>
          {formatDateTime(reservation.startTime)} → {formatDateTime(reservation.endTime)}
        </span>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t('reservationList.labelService')}</span>
          <span className={`${styles.metaValue} ${styles.mono}`} title={reservation.serviceId}>
            {truncate(reservation.serviceId)}
          </span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t('reservationList.labelResource')}</span>
          <span className={`${styles.metaValue} ${styles.mono}`} title={reservation.resourceId}>
            {truncate(reservation.resourceId)}
          </span>
        </span>
        {showUserId && reservation.userId && (
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>{t('reservationList.labelUser')}</span>
            <span className={`${styles.metaValue} ${styles.mono}`} title={reservation.userId}>
              {truncate(reservation.userId)}
            </span>
          </span>
        )}
      </div>

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
