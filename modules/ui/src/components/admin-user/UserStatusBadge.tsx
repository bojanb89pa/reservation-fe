import { useTranslation } from 'react-i18next';
import type { UserStatus } from '@fe/domain';
import styles from './UserStatusBadge.module.css';

interface Props {
  status: UserStatus;
}

export function UserStatusBadge({ status }: Props) {
  const { t } = useTranslation();

  return (
    <span className={[styles.badge, styles[`status${status}`]].join(' ')}>
      {t(`userStatus.${status}`)}
    </span>
  );
}
