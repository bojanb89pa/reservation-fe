import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BusinessErrorCode,
  MIN_CANCELLATION_NOTICE_MINUTES,
  MAX_CANCELLATION_NOTICE_MINUTES,
} from '@fe/domain';
import type { Business } from '@fe/domain';
import { useIsBusinessOwner } from '../../hooks/useBusinessMembers';
import {
  useSetCancellationDeadline,
  useRemoveCancellationDeadline,
} from '../../hooks/useCancellationDeadline';
import styles from './BusinessImageSection.module.css';

interface Props {
  business: Business;
}

type Unit = 'minutes' | 'hours' | 'days';

const UNIT_MINUTES: Record<Unit, number> = { minutes: 1, hours: 60, days: 1440 };
const UNITS: Unit[] = ['minutes', 'hours', 'days'];

function errorCodeOf(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;
  return (err as { code?: string }).code ?? err.message;
}

/** Presentation-only: picks the largest unit that divides the value evenly. */
function splitMinutes(total: number): { amount: number; unit: Unit } {
  if (total % UNIT_MINUTES.days === 0) return { amount: total / UNIT_MINUTES.days, unit: 'days' };
  if (total % UNIT_MINUTES.hours === 0)
    return { amount: total / UNIT_MINUTES.hours, unit: 'hours' };
  return { amount: total, unit: 'minutes' };
}

/** Owner-only form for the reservation cancellation deadline. */
export function CancellationDeadlineSection({ business }: Props) {
  const { t } = useTranslation();
  const isOwner = useIsBusinessOwner(business.id ?? undefined);
  const { mutateAsync: setDeadline, isPending: saving } = useSetCancellationDeadline(
    business.id ?? '',
  );
  const { mutateAsync: removeDeadline, isPending: removing } = useRemoveCancellationDeadline(
    business.id ?? '',
  );
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<Unit>('hours');
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) return null;

  const busy = saving || removing;
  const current = business.minNoticeMinutes;

  const toMessage = (err: unknown): string => {
    const code = errorCodeOf(err);
    if (code === BusinessErrorCode.OWNER_REQUIRED) return t('cancellationDeadline.errorOwnerRequired');
    if (code === BusinessErrorCode.CANCELLATION_MIN_NOTICE_INVALID)
      return t('cancellationDeadline.errorInvalid');
    return t('cancellationDeadline.errorGeneric');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const value = Number(amount);
    const minutes = value * UNIT_MINUTES[unit];
    if (
      amount.trim() === '' ||
      !Number.isInteger(minutes) ||
      minutes < MIN_CANCELLATION_NOTICE_MINUTES ||
      minutes > MAX_CANCELLATION_NOTICE_MINUTES
    ) {
      setError(t('cancellationDeadline.errorRange'));
      return;
    }
    try {
      await setDeadline(minutes);
      setAmount('');
    } catch (err: unknown) {
      setError(toMessage(err));
    }
  };

  const handleRemove = async () => {
    setError(null);
    try {
      await removeDeadline();
    } catch (err: unknown) {
      setError(toMessage(err));
    }
  };

  const currentText =
    current == null
      ? t('cancellationDeadline.currentNone')
      : t(`cancellationDeadline.current.${splitMinutes(current).unit}`, {
          count: splitMinutes(current).amount,
        });

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t('cancellationDeadline.sectionTitle')}</h2>
      </div>

      <p className={styles.sectionMeta} role="status">
        {currentText}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <label>
          {t('cancellationDeadline.amountLabel')}{' '}
          <input
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
          />
        </label>{' '}
        <label>
          {t('cancellationDeadline.unitLabel')}{' '}
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} disabled={busy}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {t(`cancellationDeadline.unit.${u}`)}
              </option>
            ))}
          </select>
        </label>{' '}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t('cancellationDeadline.save')}
        </button>{' '}
        {current != null && (
          <button type="button" className="btn btn-ghost" onClick={handleRemove} disabled={busy}>
            {t('cancellationDeadline.remove')}
          </button>
        )}
      </form>
      <p className={styles.sectionMeta}>{t('cancellationDeadline.hint')}</p>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
