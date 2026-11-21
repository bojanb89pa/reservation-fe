import { useTranslation } from 'react-i18next';
import { normalizeReservationOrigin } from '@fe/domain';
import styles from './ReservationOriginBadge.module.css';

interface Props {
  origin?: string | null;
  originClient?: string | null;
}

export function ReservationOriginBadge({ origin, originClient }: Props) {
  const { t } = useTranslation();
  const normalized = normalizeReservationOrigin(origin);

  if (normalized === 'RESERVA_APP') return null;

  let label: string;
  if (normalized === 'AI_ASSISTANT') {
    const client = originClient?.trim();
    // originClient je spoljni tekst — renderuje se kao običan tekst (React ga escape-uje).
    label = client
      ? t('reservationOrigin.aiAssistantVia', { client, interpolation: { escapeValue: false } })
      : t('reservationOrigin.aiAssistant');
  } else {
    label = t('reservationOrigin.clientApplication');
  }

  return (
    <span
      className={styles.badge}
      role="status"
      aria-label={label}
      data-testid="reservation-origin-badge"
    >
      {label}
    </span>
  );
}
