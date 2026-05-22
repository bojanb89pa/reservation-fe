import { useState } from 'react';
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
  const { data: members = [] } = useBusinessMembers(businessId, role);
  const { mutateAsync: addMember, isPending: adding, error: addError } = useAddBusinessMember(businessId, role);
  const { mutateAsync: removeMember, isPending: removing } = useRemoveBusinessMember(businessId, role);

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
        <span className={styles.sectionMeta}>{members.length} total</span>
      </div>

      <div className={styles.list}>
        {members.length === 0 && (
          <div className={styles.empty}>No {title.toLowerCase()} yet.</div>
        )}
        {members.map((m) => (
          <div key={m.id} className={styles.row}>
            <span className={styles.userId}>{m.userId}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => removeMember(m.userId)}
              disabled={removing}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          className={`form-input ${styles.formInput}`}
          placeholder="User ID (UUID)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={adding}>
          + Add {title.slice(0, -1).toLowerCase()}
        </button>
      </form>
      {addError && (
        <div className={styles.error}>
          {addError instanceof Error ? addError.message : 'Failed to add member.'}
        </div>
      )}
    </section>
  );
}
