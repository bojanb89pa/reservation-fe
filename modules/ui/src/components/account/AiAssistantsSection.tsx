import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from './ProfilePictureSection.module.css';

export function AiAssistantsSection() {
  const { t } = useTranslation();
  return (
    <section className={styles.section} aria-labelledby="ai-assistants-title">
      <div className={styles.sectionHead}>
        <h2 id="ai-assistants-title" className={styles.sectionTitle}>
          {t('account.aiAssistantsTitle')}
        </h2>
      </div>
      <p>{t('account.aiAssistantsDescription')}</p>
      <Link to="/account/ai-assistants" className="btn btn-secondary">
        {t('account.aiAssistantsCta')}
      </Link>
    </section>
  );
}
