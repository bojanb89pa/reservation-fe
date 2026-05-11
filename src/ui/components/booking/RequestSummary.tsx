import { useState } from 'react';
import type { Resource } from '@domain/entities/Resource';
import styles from './RequestSummary.module.css';

interface Props {
  resource: Resource;
  businessName: string;
  when: string | null;
  onConfirm: (note: string) => void;
  isLoading?: boolean;
}

export function RequestSummary({ resource, businessName, when, onConfirm, isLoading }: Props) {
  const [note, setNote] = useState('');

  return (
    <aside className={styles.summary}>
      <div className="eyebrow-rule">Booking details</div>
      <h3 className={styles.title}>{resource.name}</h3>
      <dl className={styles.list}>
        <div><dt>Business</dt><dd>{businessName}</dd></div>
        <div>
          <dt>When</dt>
          <dd className="mono">{when ?? '—'}</dd>
        </div>
        <div><dt>Resource type</dt><dd>{resource.type}</dd></div>
      </dl>
      <textarea
        className={styles.textarea}
        placeholder="Add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        className="btn btn-primary btn-block"
        onClick={() => onConfirm(note)}
        disabled={!when || isLoading}
      >
        {isLoading ? 'Sending…' : 'Request to book'}
      </button>
      <p className={styles.fineprint}>No charge until the provider confirms.</p>
    </aside>
  );
}
