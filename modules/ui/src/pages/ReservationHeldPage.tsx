import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import type { Reservation } from '@domain';
import type { Business } from '@domain';
import type { Resource } from '@domain';
import styles from './ReservationHeldPage.module.css';

interface HeldState {
  reservation: Reservation;
  business?: Business;
  resource?: Resource;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReservationHeldPage() {
  const { state } = useLocation() as { state: HeldState | null };
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!state) {
    return (
      <div className={styles.page}>
        <p style={{ color: 'var(--ink-500)' }}>{t('reservationHeld.notFound')}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
          {t('reservationHeld.backToHome')}
        </Link>
      </div>
    );
  }

  const { reservation, business, resource } = state;
  const businessName = business?.name ?? reservation.business?.name ?? '—';
  const resourceName = resource?.name ?? reservation.resource?.name ?? '—';
  const confCode = `conf-${(reservation.id ?? 'XXXXXX').slice(0, 6).toUpperCase()}`;

  return (
    <div className={styles.page}>
      <div className="eyebrow-rule">{t('reservationHeld.eyebrow')}</div>
      <h1 className={styles.title}>{t('reservationHeld.title')}</h1>
      <p className={styles.subtitle}>
        <Trans
          i18nKey="reservationHeld.subtitle"
          values={{ business: businessName }}
          components={{ bold: <strong /> }}
        />
      </p>

      <div className={styles.card}>
        <dl>
          <div className={styles.row}>
            <dt>{t('reservationHeld.where')}</dt>
            <dd>
              {businessName} — {resourceName}
            </dd>
          </div>
          <div className={styles.row}>
            <dt>{t('reservationHeld.start')}</dt>
            <dd className="mono">{formatDateTime(reservation.startTime)}</dd>
          </div>
          <div className={styles.row}>
            <dt>{t('reservationHeld.end')}</dt>
            <dd className="mono">{formatDateTime(reservation.endTime)}</dd>
          </div>
          <div className={styles.row}>
            <dt>{t('reservationHeld.confirmation')}</dt>
            <dd className="mono">{confCode}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.actions}>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          {t('reservationHeld.backToHome')}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/businesses')}>
          {t('reservationHeld.browseMore')}
        </button>
      </div>
    </div>
  );
}
