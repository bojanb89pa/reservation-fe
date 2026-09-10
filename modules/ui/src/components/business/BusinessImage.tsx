import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './BusinessImage.module.css';

const GRADIENTS = [
  'radial-gradient(120% 140% at 20% 0%,#7C7CF8 0%,#3B3B7A 55%,#15162B 100%)',
  'radial-gradient(120% 140% at 80% 0%,#FF8A7A 0%,#7A3E48 55%,#241222 100%)',
  'radial-gradient(120% 140% at 20% 0%,#3EE6C4 0%,#1E5E58 55%,#0B1B22 100%)',
  'radial-gradient(120% 140% at 80% 0%,#FFD166 0%,#7A6232 55%,#211A12 100%)',
  'radial-gradient(120% 140% at 50% 0%,#67D6FF 0%,#2E4E7A 55%,#10142B 100%)',
];

/** Stable per business, so a placeholder keeps the same colour between renders. */
function getGradient(seed: string | null): string {
  if (!seed) return GRADIENTS[0]!;
  return GRADIENTS[seed.charCodeAt(0) % GRADIENTS.length]!;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

interface Props {
  name: string;
  /** Relative path served by the backend, or `null` when the business has no image. */
  imageUrl: string | null;
  /** Seeds the placeholder colour; the business id keeps it stable. */
  seed?: string | null;
  /** `card` is 4:3, `hero` is 16:9. Both crop with `object-fit: cover`. */
  variant?: 'card' | 'hero';
  /** Rendered above the scrim — the business name and its surrounding meta. */
  children?: ReactNode;
}

/**
 * Fixed-ratio image frame. A missing image is an ordinary state, not an error:
 * the initials placeholder fills exactly the same box so no card shifts.
 */
export function BusinessImage({ name, imageUrl, seed = null, variant = 'card', children }: Props) {
  const { t } = useTranslation();

  return (
    <div className={[styles.frame, variant === 'hero' ? styles.hero : styles.card].join(' ')}>
      {imageUrl ? (
        <img
          className={styles.image}
          src={imageUrl}
          alt={t('businessImage.alt', { name })}
          loading="lazy"
        />
      ) : (
        <div className={styles.placeholder} style={{ background: getGradient(seed) }}>
          <span className={styles.initials} aria-hidden="true">
            {getInitials(name)}
          </span>
        </div>
      )}
      <div className={styles.scrim} />
      {children && <div className={styles.overlay}>{children}</div>}
    </div>
  );
}
