import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConsentStatus, OwnerClientApplicationConsent } from '@fe/domain';
import {
  useDecideClientApplicationConsent,
  useMyClientApplicationConsents,
} from '../../hooks/useClientApplications';
import { PartnerConsentCard } from '../../components/client-application/PartnerConsentCard';
import styles from './DashboardPartnersPage.module.css';

const STATUS_ORDER: ConsentStatus[] = ['PENDING', 'APPROVED', 'REVOKED'];

interface LocationGroup {
  locationId: string;
  location: OwnerClientApplicationConsent['location'];
  consents: OwnerClientApplicationConsent[];
}

function groupByLocation(consents: OwnerClientApplicationConsent[]): LocationGroup[] {
  const groups = new Map<string, LocationGroup>();
  for (const consent of consents) {
    const existing = groups.get(consent.location.id);
    if (existing) existing.consents.push(consent);
    else
      groups.set(consent.location.id, {
        locationId: consent.location.id,
        location: consent.location,
        consents: [consent],
      });
  }
  return [...groups.values()];
}

export function DashboardPartnersPage() {
  const { t } = useTranslation();
  const { data: consents, isLoading, isError } = useMyClientApplicationConsents();
  const { approve, revoke } = useDecideClientApplicationConsent();
  const [error, setError] = useState<string | null>(null);

  const decide = async (action: 'approve' | 'revoke', consentId: string) => {
    setError(null);
    try {
      await (action === 'approve' ? approve : revoke).mutateAsync(consentId);
    } catch {
      setError(
        t(
          action === 'approve' ? 'dashboardPartners.errorApprove' : 'dashboardPartners.errorRevoke',
        ),
      );
    }
  };

  const isDeciding = approve.isPending || revoke.isPending;
  const groups = groupByLocation(consents ?? []);

  return (
    <div>
      <div className={styles.topbar}>
        <div className={styles.eyebrow}>{t('dashboard.eyebrow')}</div>
        <h1 className={styles.pageTitle}>{t('dashboardPartners.title')}</h1>
        <p className={styles.intro}>{t('dashboardPartners.intro')}</p>
      </div>

      {isLoading && <div className="spinner" />}
      {isError && <div className="error-box">{t('dashboardPartners.errorLoad')}</div>}
      {error && (
        <div className="error-box" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      {consents && groups.length === 0 && (
        <div className={styles.empty}>{t('dashboardPartners.empty')}</div>
      )}

      {groups.map((group) => {
        const title = group.location.name ?? group.location.addressLine1 ?? group.location.id;
        const address = [group.location.addressLine1, group.location.city]
          .filter((part): part is string => !!part)
          .join(', ');
        return (
          <section
            key={group.locationId}
            className={styles.location}
            data-testid="partner-location"
          >
            <h2 className={styles.locationTitle}>{title}</h2>
            {address && <div className={styles.locationAddress}>{address}</div>}
            {STATUS_ORDER.map((status) => {
              const items = group.consents.filter((c) => c.status === status);
              if (items.length === 0) return null;
              return (
                <div key={status}>
                  <h3 className={styles.statusTitle}>{t(`dashboardPartners.status_${status}`)}</h3>
                  {items.map((consent) => (
                    <PartnerConsentCard
                      key={consent.id}
                      consent={consent}
                      isDeciding={isDeciding}
                      onApprove={(id) => decide('approve', id)}
                      onRevoke={(id) => decide('revoke', id)}
                    />
                  ))}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
