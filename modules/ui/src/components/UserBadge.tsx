import { useTranslation } from 'react-i18next';
import type { User } from '@domain';
import { Avatar } from './Avatar';
import styles from './UserBadge.module.css';

interface Props {
  userId: string;
  /** `undefined` when the id was left out of a batch lookup response — treated as unknown, not an error. */
  user: User | undefined;
  size?: number;
}

/** Avatar plus display name for a single user id, everywhere a raw id used to be shown. */
export function UserBadge({ userId, user, size = 28 }: Props) {
  const { t } = useTranslation();

  return (
    <span className={styles.badge} title={userId}>
      <Avatar
        firstName={user?.firstName}
        lastName={user?.lastName}
        profilePictureUrl={user?.profilePictureUrl}
        size={size}
      />
      {user ? (
        <span className={styles.name}>
          {user.firstName} {user.lastName}
        </span>
      ) : (
        <span className={`${styles.name} ${styles.unknown}`}>{t('userBadge.unknown')}</span>
      )}
    </span>
  );
}
