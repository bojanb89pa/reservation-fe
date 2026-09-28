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

  // `showActions` je dashboard-only (vidi DashboardReservationsPage.tsx) — svako ko tamo ima
  // pristup je admin ili vlasnik/zaposleni čijeg biznisa su rezervacije, pa se batch fetch radi
  // za sve redove; ReservationListItem ipak precizno odlučuje po redu (canManage) da li da
  // prikaže ime, ne oslanja se samo na ovaj fetch.
  const userIds = useMemo(
    () =>
      showUserId || showActions
        ? reservations.map((r) => r.userId).filter((id): id is string => !!id)
        : [],
    [reservations, showUserId, showActions],
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
