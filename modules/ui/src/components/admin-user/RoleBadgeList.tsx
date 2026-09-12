import { useTranslation } from 'react-i18next';
import type { Role } from '@domain';
import styles from './RoleBadgeList.module.css';

interface Props {
  roles: Role[];
}

export function RoleBadgeList({ roles }: Props) {
  const { t } = useTranslation();

  return (
    <span className={styles.list}>
      {roles.map((role) => (
        <span key={role} className={styles.badge}>
          {t(`roleLabel.${role}`)}
        </span>
      ))}
    </span>
  );
}
