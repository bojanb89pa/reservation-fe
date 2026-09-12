import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUser } from '../hooks/useProfilePicture';
import { ProfilePictureSection } from '../components/account/ProfilePictureSection';
import styles from './AccountPage.module.css';

export function AccountPage() {
  const { isAuthenticated, initiateLogin } = useAuth();
  const { t } = useTranslation();
  const { user, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (!isAuthenticated) initiateLogin();
  }, [isAuthenticated, initiateLogin]);

  if (!isAuthenticated) return null;

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.eyebrow}>{t('account.eyebrow')}</div>
        <h1 className={styles.title}>{t('account.title')}</h1>
      </div>

      {isLoading && (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      )}

      {isError && <div className="error-box">{t('account.error')}</div>}

      {!isLoading && !isError && user && <ProfilePictureSection user={user} />}
    </div>
  );
}
