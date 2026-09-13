import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { User, UserStatus } from '@domain';
import {
  useAdminUsersSearch,
  useCreateAdminUser,
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
import styles from './DashboardUsersPage.module.css';

const PAGE_SIZE = 20;
const STATUS_OPTIONS: UserStatus[] = ['ACTIVE', 'INACTIVE', 'BLOCKED'];

type Mode =
  | { type: 'idle' }
  | { type: 'create' }
  | { type: 'edit'; user: User }
  | { type: 'reset'; user: User }
  | { type: 'delete'; user: User };

export function DashboardUsersPage() {
  const { t } = useTranslation();
  const { errorMessage } = useAdminUserMessages();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [search, setSearch] = useState(searchInput);
  const [status, setStatus] = useState<UserStatus | ''>(
    (searchParams.get('status') as UserStatus | null) ?? '',
  );
  const [page, setPage] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchInput.trim()) next.set('search', searchInput.trim());
        else next.delete('search');
        return next;
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, setSearchParams]);

  const handleStatusChange = (value: UserStatus | '') => {
    setStatus(value);
    setPage(0);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('status', value);
      else next.delete('status');
      return next;
    });
  };

  const filter = { search: search.trim() || undefined, status: status || undefined };
  const { data, isLoading } = useAdminUsersSearch(filter, { page, size: PAGE_SIZE });

  const { mutateAsync: createUser, isPending: creating } = useCreateAdminUser();
  const { mutateAsync: updateUser, isPending: updating } = useUpdateAdminUser();
  const { mutateAsync: updateStatus, isPending: updatingStatus } = useUpdateAdminUserStatus();
  const { mutateAsync: resetPassword, isPending: resettingPassword } =
    useResetAdminUserPassword();
  const { mutateAsync: deleteUser, isPending: deleting } = useDeleteAdminUser();

  const [mode, setMode] = useState<Mode>({ type: 'idle' });
  const [formError, setFormError] = useState<string | null>(null);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);

  const reset = () => {
    setMode({ type: 'idle' });
    setFormError(null);
  };

  const handleCreate = async (values: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    roles: User['roles'];
  }) => {
    setFormError(null);
    try {
      await createUser({
        email: values.email,
        password: values.password!,
        firstName: values.firstName,
        lastName: values.lastName,
        roles: values.roles,
      });
      reset();
    } catch (err: unknown) {
      setFormError(errorMessage(err));
    }
  };

  const handleUpdate = async (
    id: string,
    values: { email: string; firstName: string; lastName: string; roles: User['roles'] },
  ) => {
    setFormError(null);
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
      setFormError(errorMessage(err));
    }
  };

  const handleStatusAction = async (user: User, newStatus: UserStatus) => {
    if (!user.id) return;
    setStatusPendingId(user.id);
    try {
      await updateStatus({ id: user.id, command: { status: newStatus } });
    } catch {
      // Row-level status errors are transient and self-evident from the unchanged badge;
      // no dedicated error slot exists per row, so we don't surface a second error banner here.
    } finally {
      setStatusPendingId(null);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (mode.type !== 'reset' || !mode.user.id) return;
    setFormError(null);
    try {
      await resetPassword({ id: mode.user.id, command: { newPassword } });
      reset();
    } catch (err: unknown) {
      setFormError(errorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (mode.type !== 'delete' || !mode.user.id) return;
    setFormError(null);
    try {
      await deleteUser(mode.user.id);
      reset();
    } catch (err: unknown) {
      setFormError(errorMessage(err));
    }
  };

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>{t('dashboard.eyebrow')}</div>
          <h1 className={styles.pageTitle}>{t('dashboardUsers.title')}</h1>
        </div>
        {mode.type === 'idle' && (
          <button className="btn btn-secondary" onClick={() => setMode({ type: 'create' })}>
            {t('dashboardUsers.newUser')}
          </button>
        )}
      </div>

      {mode.type === 'create' && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>{t('dashboardUsers.createTitle')}</h3>
          <UserForm
            onSave={handleCreate}
            onCancel={reset}
            isPending={creating}
            error={formError}
          />
        </div>
      )}

      {mode.type === 'edit' && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>{t('dashboardUsers.editTitle')}</h3>
          <UserForm
            initial={mode.user}
            onSave={(values) => handleUpdate(mode.user.id!, values)}
            onCancel={reset}
            isPending={updating}
            error={formError}
          />
        </div>
      )}

      <div className={styles.filters}>
        <input
          className="form-input"
          placeholder={t('dashboardUsers.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="form-input"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as UserStatus | '')}
        >
          <option value="">{t('dashboardUsers.statusAll')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`userStatus.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('dashboardUsers.allUsers')}</h2>
          <span className={styles.sectionMeta}>
            {t('dashboardUsers.registered', { count: data?.totalElements ?? 0 })}
          </span>
        </div>

        {isLoading && (
          <div className="page-loading">
            <div className="spinner" />
          </div>
        )}

        {!isLoading && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('dashboardUsers.colName')}</th>
                  <th>{t('dashboardUsers.colEmail')}</th>
                  <th>{t('dashboardUsers.colRoles')}</th>
                  <th>{t('dashboardUsers.colStatus')}</th>
                  <th>{t('dashboardUsers.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.content.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link to={`/dashboard/users/${user.id}`} className={styles.userLink}>
                        {user.firstName} {user.lastName}
                      </Link>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <RoleBadgeList roles={user.roles} />
                    </td>
                    <td>
                      <UserStatusBadge status={user.status} />
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setFormError(null);
                            setMode({ type: 'edit', user });
                          }}
                        >
                          {t('dashboardUsers.edit')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setFormError(null);
                            setMode({ type: 'reset', user });
                          }}
                        >
                          {t('dashboardUsers.resetPassword')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            setFormError(null);
                            setMode({ type: 'delete', user });
                          }}
                        >
                          {t('dashboardUsers.delete')}
                        </button>
                        <UserStatusActions
                          status={user.status}
                          onChangeStatus={(newStatus) => handleStatusAction(user, newStatus)}
                          isPending={updatingStatus && statusPendingId === user.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data?.content.length === 0 && (
              <div className={styles.empty}>{t('dashboardUsers.noUsers')}</div>
            )}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('dashboardUsers.prevPage')}
            </button>
            <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-500)' }}>
              {t('dashboardUsers.pageOf', { page: page + 1, total: data.totalPages })}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page + 1 >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('dashboardUsers.nextPage')}
            </button>
          </div>
        )}
      </section>

      {mode.type === 'reset' && (
        <ResetPasswordDialog
          onConfirm={handleResetPassword}
          onCancel={reset}
          isPending={resettingPassword}
          error={formError}
        />
      )}

      {mode.type === 'delete' && (
        <DeleteUserDialog
          user={mode.user}
          onConfirm={handleDelete}
          onCancel={reset}
          isPending={deleting}
          error={formError}
        />
      )}
    </div>
  );
}
