import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClientApplicationIntegrationErrorCode } from '@fe/domain';
import type { UpdateClientApplicationIntegrationCommand } from '@fe/domain';
import {
  useClientApplication,
  useClientApplicationIntegration,
  useUpdateClientApplicationIntegration,
} from '../../hooks/useClientApplications';
import { ClientApplicationIntegrationForm } from '../../components/client-application/ClientApplicationIntegrationForm';
import { ClientApplicationScopeSummary } from '../../components/client-application/ClientApplicationScopeSummary';
import styles from './DashboardClientApplicationDetailPage.module.css';

const INTEGRATION_ERROR_KEYS: Record<ClientApplicationIntegrationErrorCode, string> = {
  [ClientApplicationIntegrationErrorCode.ISSUER_INVALID]:
    'clientApplicationIntegration.errorIssuerInvalid',
  [ClientApplicationIntegrationErrorCode.ORIGIN_INVALID]:
    'clientApplicationIntegration.errorOriginInvalid',
  [ClientApplicationIntegrationErrorCode.SCOPE_UNSUPPORTED]:
    'clientApplicationIntegration.errorScopeUnsupported',
};

/** Maps a 422 carrying one of the BE message keys to its i18n key; `null` for anything else. */
function integrationErrorKey(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  const code = (
    Object.keys(INTEGRATION_ERROR_KEYS) as ClientApplicationIntegrationErrorCode[]
  ).find((c) => err.message.includes(c));
  return code ? INTEGRATION_ERROR_KEYS[code] : null;
}

export function DashboardClientApplicationDetailPage() {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const application = useClientApplication(id);
  const integration = useClientApplicationIntegration(id);
  const { mutateAsync: updateIntegration, isPending } = useUpdateClientApplicationIntegration();

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async (command: UpdateClientApplicationIntegrationCommand) => {
    setError(null);
    setSaved(false);
    try {
      await updateIntegration(command);
      setSaved(true);
    } catch (err: unknown) {
      const key = integrationErrorKey(err);
      setError(key ? t(key) : t('clientApplicationIntegration.errorSave'));
    }
  };

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(i18n.language) : t('clientApplicationDetail.notDecided');

  const detail = application.data;

  return (
    <div>
      <div className={styles.topbar}>
        <Link to="/dashboard/client-applications" className={styles.back}>
          {t('clientApplicationDetail.back')}
        </Link>
        <div className={styles.eyebrow}>{t('dashboard.eyebrow')}</div>
        <h1 className={styles.pageTitle}>{detail?.name ?? t('clientApplicationDetail.title')}</h1>
      </div>

      {application.isLoading && <div className="spinner" />}
      {application.isError && (
        <div className="error-box">{t('clientApplicationDetail.errorLoad')}</div>
      )}

      {detail && (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('clientApplicationDetail.generalTitle')}</h2>
            <div className={styles.row}>
              <span className={styles.label}>{t('clientApplicationDetail.name')}</span>
              <span>{detail.name}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>{t('dashboardClientApplications.resultEnabled')}</span>
              <span>
                {detail.enabled
                  ? t('dashboardClientApplications.enabledYes')
                  : t('dashboardClientApplications.enabledNo')}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>{t('clientApplicationDetail.scope')}</span>
              <ClientApplicationScopeSummary scope={detail.scope} />
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('clientApplicationDetail.consentsTitle')}</h2>
            {detail.consents.length === 0 ? (
              <div className={styles.empty}>{t('clientApplicationDetail.noConsents')}</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{t('clientApplicationDetail.consentLocation')}</th>
                    <th scope="col">{t('clientApplicationDetail.consentStatus')}</th>
                    <th scope="col">{t('clientApplicationDetail.consentDecidedAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.consents.map((consent) => (
                    <tr key={consent.id} data-testid="client-application-consent-row">
                      <td>{consent.locationId}</td>
                      <td>{t(`consentStatus.${consent.status}`)}</td>
                      <td>{formatDate(consent.decidedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('clientApplicationIntegration.title')}</h2>
        {integration.isLoading && <div className="spinner" />}
        {integration.isError && (
          <div className="error-box">{t('clientApplicationIntegration.errorLoad')}</div>
        )}
        {saved && (
          <div className={styles.success} role="status">
            {t('clientApplicationIntegration.saved')}
          </div>
        )}
        {error && (
          <div className="error-box" role="alert" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        {integration.data && (
          <ClientApplicationIntegrationForm
            key={JSON.stringify(integration.data)}
            integration={integration.data}
            onSubmit={handleSave}
            isPending={isPending}
          />
        )}
      </section>
    </div>
  );
}
