import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UnauthorizedError, type BusinessMemberRole, type UserSummary } from '@fe/domain';
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
  role: BusinessMemberRole;
  title: string;
}

export function MemberSection({ businessId, role, title }: Props) {
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
  // The owner may type an email for an account the search cannot find; the autocomplete
  // only helps. `inputKey` remounts the input to clear it after a successful add.
  const [typedEmail, setTypedEmail] = useState('');
  const [inputKey, setInputKey] = useState(0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = selectedUser?.email ?? typedEmail.trim();
    if (!email) return;
    setNotifiedEmail(null);
    try {
      await addMember(email);
    } catch {
      // The failure is shown through `addError`; nothing to confirm here.
      return;
    }
    setSelectedUser(null);
    setTypedEmail('');
    setInputKey((k) => k + 1);
    setNotifiedEmail(email);
    // Best-effort: the invitation email is transparent to the add flow, so its outcome
    // never blocks or overrides the confirmation shown to the user.
    notifyMembership({ businessId, email }).catch(() => {});
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
          key={inputKey}
          onQueryChange={setTypedEmail}
          selectedUser={selectedUser}
          onSelect={setSelectedUser}
          onClear={() => setSelectedUser(null)}
          placeholder={t('memberSection.userSearchPlaceholder')}
          disabled={adding}
        />
        <button type="submit" className="btn btn-secondary" disabled={adding || (!selectedUser && !typedEmail.trim())}>
          {t(`memberSection.${role}.addButton`)}
        </button>
      </form>
      {addError && (
        <div role="alert" className={styles.error}>
          {addError instanceof UnauthorizedError
            ? t('memberSection.addForbidden')
            : addError instanceof Error
              ? addError.message
              : t('memberSection.errorAdd')}
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
