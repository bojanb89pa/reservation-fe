import { useTranslation } from 'react-i18next';
import styles from './Avatar.module.css';

interface Props {
  firstName?: string | null;
  lastName?: string | null;
  /** Relative path served by the backend, or `null`/`undefined` when there is no image — an ordinary state, not an error. */
  profilePictureUrl?: string | null;
  /** Diameter in px. */
  size?: number;
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

/**
 * A user's picture, or a circle of their initials when there is none, or a
 * generic mark when even the name is unknown (e.g. an id missing from a batch lookup).
 */
export function Avatar({ firstName, lastName, profilePictureUrl = null, size = 40 }: Props) {
  const { t } = useTranslation();
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const initials = getInitials(firstName, lastName);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };

  if (profilePictureUrl) {
    return (
      <img
        className={styles.avatar}
        style={style}
        src={profilePictureUrl}
        alt={fullName ? t('avatar.alt', { name: fullName }) : t('avatar.altUnknown')}
      />
    );
  }

  return (
    <div
      className={styles.avatar}
      style={style}
      role="img"
      aria-label={fullName ? t('avatar.alt', { name: fullName }) : t('avatar.altUnknown')}
    >
      {initials || '?'}
    </div>
  );
}
