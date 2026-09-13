import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { UserStatus, Role } from '@domain';
import {
  useAdminUserById,
  useUpdateAdminUser,
  useUpdateAdminUserStatus,
  useResetAdminUserPassword,
  useDeleteAdminUser,
} from '../../hooks/useAdminUsers';
import { useAdminUserMessages } from '../../hooks/useAdminUserMessages';
import { UserStatusBadge } from '../../components/admin-user/UserStatusBadge';
import { RoleBadgeList } from '../../components/admin-user/RoleBadgeList';
import { UserForm } from '../../components/admin-user/UserForm';
import { UserStatusActions } from '../../components/admin-user/UserStatusActions';
import { ResetPasswordDialog } from '../../components/admin-user/ResetPasswordDialog';
import { DeleteUserDialog } from '../../components/admin-user/DeleteUserDialog';
import styles from './DashboardUserDetailPage.module.css';

type Panel = 'view' | 'edit' | 'reset' | 'delete';

export function DashboardUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { errorMessage } = useAdminUserMessages();

  const { data: user, isLoading } = useAdminUserById(id);
  const { mutateAsync: updateUser, isPending: updating } = useUpdateAdminUser();
  const { mutateAsync: updateStatus, isPending: updatingStatus } = useUpdateAdminUserStatus();
  const { mutateAsync: resetPassword, isPending: resettingPassword } =
    useResetAdminUserPassword();
  const { mutateAsync: deleteUser, isPending: deleting } = useDeleteAdminUser();

  const [panel, setPanel] = useState<Panel>('view');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPanel('view');
    setError(null);
  };

  const handleUpdate = async (values: {
    email: string;
    firstName: string;
    lastName: string;
    roles: Role[];
  }) => {
    if (!id) return;
    setError(null);
    try {
      await updateUser({
        id,
        command: {
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          roles: values.roles,
        },
      });
      reset();
    } catch (err: unknown) {
      setError(errorMessage(err));
    }
  };

  const handleStatusAction = async (newStatus: UserStatus) => {
    if (!id) return;
    setError(null);
    try {
      await updateStatus({ id, command: { status: newStatus } });
    } catch (err: unknown) {
      setError(errorMessage(err));
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!id) return;
    setError(null);
    try {
      await resetPassword({ id, command: { newPassword } });
      reset();
    } catch (err: unknown) {
      setError(errorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setError(null);
    try {
      await deleteUser(id);
      navigate('/dashboard/users');
    } catch (err: unknown) {
      setError(errorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <div className="error-box">{t('dashboardUserDetail.notFound')}</div>;
  }

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <Link to="/dashboard/users" className={styles.breadcrumb}>
            {t('dashboardUserDetail.backToUsers')}
          </Link>
          <h1 className={styles.pageTitle}>
            {user.firstName} {user.lastName}
          </h1>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {panel === 'view' && (
        <section className={styles.card}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t('dashboardUserDetail.email')}</span>
            <span className={styles.infoValue}>{user.email}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t('dashboardUserDetail.roles')}</span>
            <RoleBadgeList roles={user.roles} />
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t('dashboardUserDetail.status')}</span>
            <UserStatusBadge status={user.status} />
          </div>

          <div className={styles.actions}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPanel('edit')}>
              {t('dashboardUserDetail.edit')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPanel('reset')}>
              {t('dashboardUserDetail.resetPassword')}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setPanel('delete')}>
              {t('dashboardUserDetail.delete')}
            </button>
          </div>

          <div className={styles.statusSection}>
            <span className={styles.infoLabel}>{t('dashboardUserDetail.changeStatus')}</span>
            <UserStatusActions
              status={user.status}
              onChangeStatus={handleStatusAction}
              isPending={updatingStatus}
            />
          </div>
        </section>
      )}

      {panel === 'edit' && (
        <section className={styles.card}>
          <UserForm
            initial={user}
            onSave={handleUpdate}
            onCancel={reset}
            isPending={updating}
            error={error}
          />
        </section>
      )}

      {panel === 'reset' && (
        <ResetPasswordDialog
          onConfirm={handleResetPassword}
          onCancel={reset}
          isPending={resettingPassword}
          error={error}
        />
      )}

      {panel === 'delete' && (
        <DeleteUserDialog
          user={user}
          onConfirm={handleDelete}
          onCancel={reset}
          isPending={deleting}
          error={error}
        />
      )}
    </div>
  );
}
