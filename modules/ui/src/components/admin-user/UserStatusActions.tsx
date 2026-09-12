import { useTranslation } from 'react-i18next';
import type { UserStatus } from '@domain';
import styles from './UserStatusActions.module.css';

interface Props {
  status: UserStatus;
  onChangeStatus: (status: UserStatus) => void;
  isPending: boolean;
}

const ACTIONS: { target: UserStatus; labelKey: string; className: string }[] = [
  { target: 'ACTIVE', labelKey: 'userStatusActions.activate', className: 'btn-secondary' },
  { target: 'INACTIVE', labelKey: 'userStatusActions.deactivate', className: 'btn-ghost' },
  { target: 'BLOCKED', labelKey: 'userStatusActions.block', className: 'btn-danger' },
];

export function UserStatusActions({ status, onChangeStatus, isPending }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.row}>
      {ACTIONS.filter((a) => a.target !== status).map((action) => (
        <button
          key={action.target}
          type="button"
          className={`btn ${action.className} btn-sm`}
          onClick={() => onChangeStatus(action.target)}
          disabled={isPending}
        >
          {t(action.labelKey)}
        </button>
      ))}
    </div>
  );
}
