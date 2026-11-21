import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { ConnectClaudeInstructions } from '../components/account/ConnectClaudeInstructions';
import { ConnectedAiApps } from '../components/account/ConnectedAiApps';
import styles from './AccountPage.module.css';

export function ConnectClaudePage() {
  const { isAuthenticated, initiateLogin } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isAuthenticated) initiateLogin();
  }, [isAuthenticated, initiateLogin]);

  if (!isAuthenticated) return null;

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.eyebrow}>{t('connectClaude.eyebrow')}</div>
        <h1 className={styles.title}>{t('connectClaude.title')}</h1>
      </div>
      <ConnectClaudeInstructions />
      <ConnectedAiApps />
    </div>
  );
}
