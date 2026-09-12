import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Reservation } from '@domain';
import { useUsersByIds, mapUsersById } from '../../hooks/useUsersByIds';
import { ReservationListItem } from './ReservationListItem';
import styles from './ReservationList.module.css';

interface Props {
  reservations: Reservation[];
  showUserId?: boolean;
  showActions?: boolean;
}

export function ReservationList({ reservations, showUserId, showActions }: Props) {
  const { t } = useTranslation();

  const userIds = useMemo(
    () => (showUserId ? reservations.map((r) => r.userId).filter((id): id is string => !!id) : []),
    [reservations, showUserId],
  );
  const { data: users } = useUsersByIds(userIds);
  const usersById = useMemo(() => mapUsersById(users ?? []), [users]);

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
          user={r.userId ? usersById.get(r.userId) : undefined}
        />
      ))}
    </div>
  );
}
