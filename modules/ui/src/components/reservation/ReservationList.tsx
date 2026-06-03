import { useTranslation } from 'react-i18next';
import type { Reservation } from '@domain';
import { ReservationListItem } from './ReservationListItem';
import styles from './ReservationList.module.css';

interface Props {
  reservations: Reservation[];
  showUserId?: boolean;
  showActions?: boolean;
}

export function ReservationList({ reservations, showUserId, showActions }: Props) {
  const { t } = useTranslation();

  if (reservations.length === 0) {
    return <div className={styles.empty}>{t('reservationList.empty')}</div>;
  }

  return (
    <div className={styles.list}>
      {reservations.map((r) => (
        <ReservationListItem
          key={r.id}
          reservation={r}
          showUserId={showUserId}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
