import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessService, DurationUnit } from '@domain';
import styles from './ServiceForm.module.css';

export interface ServiceFormValues {
  name: string;
  minDuration: number;
  maxDuration: number;
  durationUnit: DurationUnit;
  durationStep: number;
}

interface Props {
  initial?: BusinessService;
  onSave: (values: ServiceFormValues) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

function clampInt(value: string, min: number): number {
  return Math.max(min, parseInt(value, 10) || min);
}

export function ServiceForm({ initial, onSave, onCancel, isPending, error }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [fixed, setFixed] = useState(initial?.fixedDuration ?? true);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(
    initial?.durationUnit ?? 'MINUTES',
  );
  // Fixed mode value
  const [fixedValue, setFixedValue] = useState(initial?.minDuration ?? 30);
  // Custom mode values
  const [minDuration, setMinDuration] = useState(initial?.minDuration ?? 1);
  const [maxDuration, setMaxDuration] = useState(initial?.maxDuration ?? 30);
  const [durationStep, setDurationStep] = useState(initial?.durationStep ?? 1);

  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    setName(initial?.name ?? '');
    setFixed(initial?.fixedDuration ?? true);
    setDurationUnit(initial?.durationUnit ?? 'MINUTES');
    setFixedValue(initial?.minDuration ?? 30);
    setMinDuration(initial?.minDuration ?? 1);
    setMaxDuration(initial?.maxDuration ?? 30);
    setDurationStep(initial?.durationStep ?? 1);
    setValidation(null);
  }, [initial]);

  // Mirror the BE validation client-side to avoid 422s.
  function validate(): ServiceFormValues | null {
    if (!name.trim()) return null;
    if (fixed) {
      if (fixedValue < 1) {
        setValidation(t('serviceSection.rangeInvalid'));
        return null;
      }
      return {
        name: name.trim(),
        minDuration: fixedValue,
        maxDuration: fixedValue,
        durationUnit,
        durationStep: 1,
      };
    }
    if (minDuration < 1 || durationStep < 1 || maxDuration < minDuration) {
      setValidation(t('serviceSection.rangeInvalid'));
      return null;
    }
    if ((maxDuration - minDuration) % durationStep !== 0) {
      setValidation(t('serviceSection.rangeInvalid'));
      return null;
    }
    return { name: name.trim(), minDuration, maxDuration, durationUnit, durationStep };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidation(null);
    const values = validate();
    if (!values) return;
    await onSave(values);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {(error || validation) && <div className="error-box">{error ?? validation}</div>}
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
        <div className={styles.toggle} role="tablist">
          <button
            type="button"
            role="tab"
            aria-pressed={fixed}
            className={[styles.toggleBtn, fixed ? styles.toggleActive : ''].filter(Boolean).join(' ')}
            onClick={() => setFixed(true)}
          >
            {t('serviceSection.fixedLabel')}
          </button>
          <button
            type="button"
            role="tab"
            aria-pressed={!fixed}
            className={[styles.toggleBtn, !fixed ? styles.toggleActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setFixed(false)}
          >
            {t('serviceSection.customLabel')}
          </button>
        </div>
      </div>

      <div className="form-field">
        {fixed ? (
          <div className={styles.durationRow}>
            <input
              className={`form-input ${styles.durationInput}`}
              type="number"
              min="1"
              value={fixedValue}
              onChange={(e) => setFixedValue(clampInt(e.target.value, 1))}
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
        ) : (
          <>
            <div className={styles.customGrid}>
              <label className={styles.customField}>
                <span className={styles.customLabel}>{t('serviceSection.minLabel')}</span>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={minDuration}
                  onChange={(e) => setMinDuration(clampInt(e.target.value, 1))}
                  required
                />
              </label>
              <label className={styles.customField}>
                <span className={styles.customLabel}>{t('serviceSection.maxLabel')}</span>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(clampInt(e.target.value, 1))}
                  required
                />
              </label>
              <label className={styles.customField}>
                <span className={styles.customLabel}>{t('serviceSection.stepLabel')}</span>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={durationStep}
                  onChange={(e) => setDurationStep(clampInt(e.target.value, 1))}
                  required
                />
              </label>
            </div>
            <div className={styles.unitRow}>
              <span className={styles.customLabel}>{t('serviceSection.unitLabel')}</span>
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
          </>
        )}
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
