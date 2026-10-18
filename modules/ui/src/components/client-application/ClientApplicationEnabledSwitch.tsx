import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ClientApplicationEnabledSwitch.module.css';

interface ClientApplicationEnabledSwitchProps {
  applicationName: string;
  enabled: boolean;
  isPending: boolean;
  error: string | null;
  onConfirm: (enabled: boolean) => Promise<boolean>;
}

/** Switch showing the current `enabled` state; any change must be confirmed in a dialog first. */
export function ClientApplicationEnabledSwitch({
  applicationName,
  enabled,
  isPending,
  error,
  onConfirm,
}: ClientApplicationEnabledSwitchProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<boolean | null>(null);

  const handleConfirm = async () => {
    if (target === null) return;
    const ok = await onConfirm(target);
    if (ok) setTarget(null);
  };

  const prefix = target ? 'clientApplicationEnabled.enable' : 'clientApplicationEnabled.disable';

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t('clientApplicationEnabled.switchLabel', { name: applicationName })}
        className={`${styles.switch} ${enabled ? styles.on : ''}`}
        disabled={isPending}
        onClick={() => setTarget(!enabled)}
      >
        <span className={styles.thumb} />
      </button>
      <span className={styles.state}>
        {enabled
          ? t('clientApplicationEnabled.stateEnabled')
          : t('clientApplicationEnabled.stateDisabled')}
      </span>

      {error && target === null && (
        <div className="error-box" role="alert" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}

      {target !== null && (
        <div className={styles.backdrop}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-application-enabled-title"
            className={styles.dialog}
          >
            <h3 id="client-application-enabled-title" className={styles.title}>
              {t(`${prefix}Title`, { name: applicationName })}
            </h3>
            <p>{t(`${prefix}Body`, { name: applicationName })}</p>
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isPending}
                onClick={() => setTarget(null)}
              >
                {t('clientApplicationEnabled.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isPending}
                onClick={handleConfirm}
              >
                {t(`${prefix}Confirm`)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
