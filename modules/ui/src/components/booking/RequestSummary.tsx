import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Resource } from '@domain';
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
  const { t } = useTranslation();

  return (
    <aside className={styles.summary}>
      <div className="eyebrow-rule">{t('booking.title')}</div>
      <h3 className={styles.title}>{resource.name}</h3>
      <dl className={styles.list}>
        <div>
          <dt>{t('booking.business')}</dt>
          <dd>{businessName}</dd>
        </div>
        <div>
          <dt>{t('booking.when')}</dt>
          <dd className="mono">{when ?? '—'}</dd>
        </div>
        <div>
          <dt>{t('booking.resourceType')}</dt>
          <dd>{resource.type}</dd>
        </div>
      </dl>
      <textarea
        className={styles.textarea}
        placeholder={t('booking.notePlaceholder')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        className="btn btn-primary btn-block"
        onClick={() => onConfirm(note)}
        disabled={!when || isLoading}
      >
        {isLoading ? t('booking.sending') : t('booking.requestToBook')}
      </button>
      <p className={styles.fineprint}>{t('booking.noCharge')}</p>
    </aside>
  );
}
