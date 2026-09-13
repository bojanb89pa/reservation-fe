import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessMemberRole, UserSummary } from '@domain';
import {
  useBusinessMembers,
  useAddBusinessMember,
  useRemoveBusinessMember,
  useNotifyBusinessMembership,
} from '../../hooks/useBusinessMembers';
import { useUsersByIds, mapUsersById } from '../../hooks/useUsersByIds';
import { UserBadge } from '../UserBadge';
import { UserAutocompleteInput } from './UserAutocompleteInput';
import styles from './MemberSection.module.css';

interface Props {
  businessId: string;
  businessName: string;
  role: BusinessMemberRole;
  title: string;
}

export function MemberSection({ businessId, businessName, role, title }: Props) {
  const { t } = useTranslation();
  const { data: members = [] } = useBusinessMembers(businessId, role);
  const memberUserIds = useMemo(
    () => members.map((m) => m.userId).filter((id): id is string => id !== null),
    [members],
  );
  const { data: users } = useUsersByIds(memberUserIds);
  const usersById = useMemo(() => mapUsersById(users ?? []), [users]);
  const {
    mutateAsync: addMember,
    isPending: adding,
    error: addError,
  } = useAddBusinessMember(businessId, role);
  const { mutateAsync: removeMember, isPending: removing } = useRemoveBusinessMember(
    businessId,
    role,
  );
  const { mutateAsync: notifyMembership } = useNotifyBusinessMembership();

  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [notifiedEmail, setNotifiedEmail] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const email = selectedUser.email;
    await addMember(email);
    setSelectedUser(null);
    setNotifiedEmail(email);
    // Best-effort: the invitation email is transparent to the add flow, so its outcome
    // never blocks or overrides the confirmation shown to the user.
    notifyMembership({ email, businessName, role }).catch(() => {});
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <span className={styles.sectionMeta}>
          {t('memberSection.total', { count: members.length })}
        </span>
      </div>

      <div className={styles.list}>
        {members.length === 0 && (
          <div className={styles.empty}>{t(`memberSection.${role}.empty`)}</div>
        )}
        {members.map((m) => (
          <div key={m.id} className={styles.row}>
            {m.userId ? (
              <UserBadge userId={m.userId} user={usersById.get(m.userId)} />
            ) : (
              // WARNING: pending membership (no userId yet, resolved once the invited
              // email registers per fe-brief #77) — shown as plain email until a
              // dedicated pending-member treatment is designed.
              <span>{m.email}</span>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => m.userId && removeMember(m.userId)}
              disabled={removing || !m.userId}
            >
              {t('memberSection.remove')}
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className={styles.addForm}>
        <UserAutocompleteInput
          selectedUser={selectedUser}
          onSelect={setSelectedUser}
          onClear={() => setSelectedUser(null)}
          placeholder={t('memberSection.userSearchPlaceholder')}
          disabled={adding}
        />
        <button type="submit" className="btn btn-secondary" disabled={adding || !selectedUser}>
          {t(`memberSection.${role}.addButton`)}
        </button>
      </form>
      {addError && (
        <div className={styles.error}>
          {addError instanceof Error ? addError.message : t('memberSection.errorAdd')}
        </div>
      )}
      {notifiedEmail && (
        <div className={styles.notice}>
          {t('memberSection.notifySuccess', { email: notifiedEmail })}
        </div>
      )}
    </section>
  );
}
