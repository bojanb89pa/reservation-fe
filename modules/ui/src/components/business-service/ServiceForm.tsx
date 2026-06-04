import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessService, DurationUnit } from '@domain';
import styles from './ServiceForm.module.css';

interface Props {
  initial?: BusinessService;
  onSave: (name: string, duration: number, durationUnit: DurationUnit) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

export function ServiceForm({ initial, onSave, onCancel, isPending, error }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [duration, setDuration] = useState(initial?.duration ?? 30);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(
    initial?.durationUnit ?? 'MINUTES',
  );

  useEffect(() => {
    setName(initial?.name ?? '');
    setDuration(initial?.duration ?? 30);
    setDurationUnit(initial?.durationUnit ?? 'MINUTES');
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || duration < 1) return;
    await onSave(name.trim(), duration, durationUnit);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className="error-box">{error}</div>}
      <div className="form-field">
        <label className="form-label">{t('serviceSection.nameLabel')}</label>
        <input
          className="form-input"
          placeholder={t('serviceSection.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="form-field">
        <label className="form-label">{t('serviceSection.durationLabel')}</label>
        <div className={styles.durationRow}>
          <input
            className={`form-input ${styles.durationInput}`}
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
            required
          />
          <select
            className={`form-input ${styles.unitSelect}`}
            value={durationUnit}
            onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
          >
            <option value="MINUTES">{t('serviceSection.minutes')}</option>
            <option value="HOURS">{t('serviceSection.hours')}</option>
            <option value="DAYS">{t('serviceSection.days')}</option>
          </select>
        </div>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onCancel}
          disabled={isPending}
        >
          {t('serviceSection.cancel')}
        </button>
        <button type="submit" className="btn btn-secondary btn-sm" disabled={isPending}>
          {isPending
            ? t('serviceSection.saving')
            : initial
              ? t('serviceSection.saveChanges')
              : t('serviceSection.createService')}
        </button>
      </div>
    </form>
  );
}
