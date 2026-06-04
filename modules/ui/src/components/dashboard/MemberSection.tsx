import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessMemberRole } from '@domain';
import {
  useBusinessMembers,
  useAddBusinessMember,
  useRemoveBusinessMember,
} from '../../hooks/useBusinessMembers';
import styles from './MemberSection.module.css';

interface Props {
  businessId: string;
  role: BusinessMemberRole;
  title: string;
}

export function MemberSection({ businessId, role, title }: Props) {
  const { t } = useTranslation();
  const { data: members = [] } = useBusinessMembers(businessId, role);
  const {
    mutateAsync: addMember,
    isPending: adding,
    error: addError,
  } = useAddBusinessMember(businessId, role);
  const { mutateAsync: removeMember, isPending: removing } = useRemoveBusinessMember(
    businessId,
    role,
  );

  const [userId, setUserId] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = userId.trim();
    if (!trimmed) return;
    await addMember(trimmed);
    setUserId('');
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
            <span className={styles.userId}>{m.userId}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => removeMember(m.userId)}
              disabled={removing}
            >
              {t('memberSection.remove')}
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          className={`form-input ${styles.formInput}`}
          placeholder={t('memberSection.userIdPlaceholder')}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary" disabled={adding}>
          {t(`memberSection.${role}.addButton`)}
        </button>
      </form>
      {addError && (
        <div className={styles.error}>
          {addError instanceof Error ? addError.message : t('memberSection.errorAdd')}
        </div>
      )}
    </section>
  );
}
