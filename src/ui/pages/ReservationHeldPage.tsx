import { useLocation, useNavigate, Link } from 'react-router-dom';
import type { Reservation } from '@domain/entities/Reservation';
import type { Business } from '@domain/entities/Business';
import type { Resource } from '@domain/entities/Resource';
import styles from './ReservationHeldPage.module.css';

interface HeldState {
  reservation: Reservation;
  business: Business;
  resource: Resource;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ReservationHeldPage() {
  const { state } = useLocation() as { state: HeldState | null };
  const navigate = useNavigate();

  if (!state) {
    return (
      <div className={styles.page}>
        <p style={{ color: 'var(--ink-500)' }}>Reservation not found.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Back to home</Link>
      </div>
    );
  }

  const { reservation, business, resource } = state;
  const confCode = `conf-${(reservation.id ?? 'XXXXXX').slice(0, 6).toUpperCase()}`;

  return (
    <div className={styles.page}>
      <div className="eyebrow-rule">You're held</div>
      <h1 className={styles.title}>We've sent the provider a note.</h1>
      <p className={styles.subtitle}>
        Your slot is held while <strong>{business.name}</strong> confirms. We'll let you
        know the moment they say yes — usually within 14 minutes.
      </p>

      <div className={styles.card}>
        <dl>
          <div className={styles.row}>
            <dt>Where</dt>
            <dd>{business.name} — {resource.name}</dd>
          </div>
          <div className={styles.row}>
            <dt>Start</dt>
            <dd className="mono">{formatDateTime(reservation.startTime)}</dd>
          </div>
          <div className={styles.row}>
            <dt>End</dt>
            <dd className="mono">{formatDateTime(reservation.endTime)}</dd>
          </div>
          <div className={styles.row}>
            <dt>Confirmation</dt>
            <dd className="mono">{confCode}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.actions}>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          Back to home
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/businesses')}>
          Browse more
        </button>
      </div>
    </div>
  );
}
