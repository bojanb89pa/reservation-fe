import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '@domain';
import { useUpdateOwnProfile } from '../../hooks/useUpdateOwnProfile';
import { useProfileNameMessages } from '../../hooks/useProfileNameMessages';
import styles from './ProfilePictureSection.module.css';

interface Props {
  user: User;
}

export function ProfileNameSection({ user }: Props) {
  const { t } = useTranslation();
  const errorMessage = useProfileNameMessages();
  const { mutate: updateProfile, isPending } = useUpdateOwnProfile();

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // WARNING: blank-name check duplicates the backend rule, kept only to avoid a pointless request — verify before merging
  const isBlank = firstName.trim() === '' || lastName.trim() === '';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isBlank) return;
    setError(null);
    setSaved(false);
    updateProfile(
      { firstName, lastName },
      {
        onSuccess: () => setSaved(true),
        onError: (err: unknown) => setError(errorMessage(err)),
      },
    );
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t('profileName.sectionTitle')}</h2>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className="form-field">
          <label className="form-label" htmlFor="profile-first-name">
            {t('profileName.firstName')}
          </label>
          <input
            id="profile-first-name"
            name="firstName"
            className="form-input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="profile-last-name">
            {t('profileName.lastName')}
          </label>
          <input
            id="profile-last-name"
            name="lastName"
            className="form-input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className={styles.actions}>
          <button type="submit" className="btn btn-secondary" disabled={isPending || isBlank}>
            {isPending ? t('profileName.saving') : t('profileName.save')}
          </button>
        </div>
      </form>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {saved && !error && <div role="status">{t('profileName.saved')}</div>}
    </section>
  );
}
