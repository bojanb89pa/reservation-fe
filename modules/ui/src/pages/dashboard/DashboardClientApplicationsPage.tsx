import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClientApplication, CreateClientApplicationCommand } from '@domain';
import { useCreateClientApplication } from '../../hooks/useClientApplications';
import { ClientApplicationForm } from '../../components/client-application/ClientApplicationForm';
import styles from './DashboardClientApplicationsPage.module.css';

export function DashboardClientApplicationsPage() {
  const { t } = useTranslation();
  const { mutateAsync: createClientApplication, isPending } = useCreateClientApplication();

  const [result, setResult] = useState<ClientApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const handleSubmit = async (command: CreateClientApplicationCommand) => {
    setError(null);
    try {
      const created = await createClientApplication(command);
      setResult(created);
      setResetKey((k) => k + 1);
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof Error ? err.message : t('dashboardClientApplications.errorCreate'));
    }
  };

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>{t('dashboard.eyebrow')}</div>
          <h1 className={styles.pageTitle}>{t('dashboardClientApplications.title')}</h1>
        </div>
      </div>

      {result && (
        <div className={styles.resultBox} role="status">
          <div className={styles.resultTitle}>{t('dashboardClientApplications.created')}</div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>{t('dashboardClientApplications.resultId')}</span>
            <span>{result.id}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>
              {t('dashboardClientApplications.resultEnabled')}
            </span>
            <span>
              {result.enabled
                ? t('dashboardClientApplications.enabledYes')
                : t('dashboardClientApplications.enabledNo')}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="error-box" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div className={styles.formWrap}>
        <h3 className={styles.formTitle}>{t('dashboardClientApplications.formTitle')}</h3>
        <ClientApplicationForm key={resetKey} onSubmit={handleSubmit} isPending={isPending} />
      </div>
    </div>
  );
}
