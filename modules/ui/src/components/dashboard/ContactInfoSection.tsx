import { useState } from 'react';
import type { BusinessContactInfo, ContactInfoType } from '@domain';
import {
  useBusinessContactInfo,
  useAddContactInfo,
  useRemoveContactInfo,
  useUpdateContactInfo,
} from '../../hooks/useBusinessContactInfo';
import styles from './ContactInfoSection.module.css';

const CONTACT_INFO_TYPES: ContactInfoType[] = [
  'PHONE',
  'EMAIL',
  'WEBSITE',
  'FACEBOOK',
  'INSTAGRAM',
  'TWITTER',
  'LINKEDIN',
  'YOUTUBE',
  'TIKTOK',
];

interface Props {
  businessId: string;
}

export function ContactInfoSection({ businessId }: Props) {
  const { data: entries = [] } = useBusinessContactInfo(businessId);
  const { mutateAsync: add, isPending: adding, error: addError } = useAddContactInfo(businessId);
  const { mutateAsync: remove, isPending: removing } = useRemoveContactInfo(businessId);
  const { mutateAsync: update, isPending: updating } = useUpdateContactInfo(businessId);

  const [addType, setAddType] = useState<ContactInfoType>('PHONE');
  const [addValue, setAddValue] = useState('');
  const [addLabel, setAddLabel] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<ContactInfoType>('PHONE');
  const [editValue, setEditValue] = useState('');
  const [editLabel, setEditLabel] = useState('');

  const startEdit = (entry: BusinessContactInfo) => {
    setEditingId(entry.id);
    setEditType(entry.type as ContactInfoType);
    setEditValue(entry.value);
    setEditLabel(entry.label ?? '');
  };

  const handleSave = async (contactInfoId: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    await update({
      contactInfoId,
      type: editType,
      value: trimmed,
      label: editLabel.trim() || undefined,
    });
    setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addValue.trim();
    if (!trimmed) return;
    await add({ type: addType, value: trimmed, label: addLabel.trim() || undefined });
    setAddValue('');
    setAddLabel('');
  };

  const canRemove = entries.length > 1;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Contact Info</h2>
        <span className={styles.sectionMeta}>{entries.length} total</span>
      </div>

      <div className={styles.list}>
        {entries.length === 0 && <div className={styles.empty}>No contact info yet.</div>}
        {entries.map((entry) =>
          editingId === entry.id ? (
            <div key={entry.id} className={styles.editRow}>
              <select
                className="form-input"
                value={editType}
                onChange={(e) => setEditType(e.target.value as ContactInfoType)}
              >
                {CONTACT_INFO_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className="form-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Label (optional)"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              />
              <div className={styles.actions}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleSave(entry.id)}
                  disabled={updating}
                >
                  Save
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={entry.id} className={styles.row}>
              <span className={styles.typeBadge}>{entry.type}</span>
              <span className={styles.value}>{entry.value}</span>
              <span className={styles.label}>{entry.label ?? '—'}</span>
              <div className={styles.actions}>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(entry)}>
                  Edit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => remove(entry.id)}
                  disabled={removing || !canRemove}
                  title={!canRemove ? 'Cannot remove the last contact info entry' : undefined}
                >
                  Remove
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      <form onSubmit={handleAdd} className={styles.addForm}>
        <select
          className="form-input"
          value={addType}
          onChange={(e) => setAddType(e.target.value as ContactInfoType)}
        >
          {CONTACT_INFO_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          className={`form-input ${styles.formInput}`}
          placeholder="Value (e.g. +381601234567)"
          value={addValue}
          onChange={(e) => setAddValue(e.target.value)}
        />
        <input
          className={`form-input ${styles.formInput}`}
          placeholder="Label (optional)"
          value={addLabel}
          onChange={(e) => setAddLabel(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={adding}>
          + Add contact info
        </button>
      </form>
      {addError && (
        <div className={styles.error}>
          {addError instanceof Error ? addError.message : 'Failed to add contact info.'}
        </div>
      )}
    </section>
  );
}
