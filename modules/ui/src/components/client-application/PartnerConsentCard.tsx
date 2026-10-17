import { useTranslation } from 'react-i18next';
import type { OwnerClientApplicationConsent } from '@fe/domain';
import { usePublicClientApplicationIntegration } from '../../hooks/useClientApplications';
import { useOAuthScopeLabel } from '../../hooks/useOAuthScopeLabel';
import { ClientApplicationScopeSummary } from './ClientApplicationScopeSummary';
import styles from '../../pages/dashboard/DashboardPartnersPage.module.css';

interface Props {
  consent: OwnerClientApplicationConsent;
  isDeciding: boolean;
  onApprove: (consentId: string) => void;
  onRevoke: (consentId: string) => void;
}

export function PartnerConsentCard({ consent, isDeciding, onApprove, onRevoke }: Props) {
  const { t } = useTranslation();
  const scopeLabel = useOAuthScopeLabel();
  const { clientApplication } = consent;
  const integration = usePublicClientApplicationIntegration(clientApplication.id);

  return (
    <div className={styles.card} data-testid="partner-consent-card">
      <div className={styles.cardName}>{clientApplication.name}</div>

      {integration.isLoading && <div className="spinner" />}
      {integration.isError && (
        <div className="error-box">{t('dashboardPartners.errorIntegration')}</div>
      )}
      {integration.isSuccess && integration.data === null && (
        <div className={styles.empty}>{t('dashboardPartners.noIntegration')}</div>
      )}
      {integration.data && (
        <>
          <div className={styles.row}>
            <span className={styles.label}>{t('dashboardPartners.domains')}</span>
            <span>
              {integration.data.allowedOrigins.length > 0
                ? integration.data.allowedOrigins.join(', ')
                : t('dashboardPartners.noDomains')}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>{t('dashboardPartners.permissions')}</span>
            <span>
              {integration.data.allowedScopes.length > 0
                ? integration.data.allowedScopes.map(scopeLabel).join(', ')
                : t('dashboardPartners.noPermissions')}
            </span>
          </div>
        </>
      )}
      <div className={styles.row}>
        <span className={styles.label}>{t('dashboardPartners.scope')}</span>
        <ClientApplicationScopeSummary scope={clientApplication.scope} />
      </div>

      <div className={styles.actions}>
        {(consent.status === 'PENDING' || consent.status === 'REVOKED') && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isDeciding}
            onClick={() => onApprove(consent.id)}
          >
            {t('dashboardPartners.approve')}
          </button>
        )}
        {consent.status === 'APPROVED' && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isDeciding}
            onClick={() => onRevoke(consent.id)}
          >
            {t('dashboardPartners.revoke')}
          </button>
        )}
      </div>
    </div>
  );
}
