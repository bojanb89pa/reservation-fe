import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import styles from './Header.module.css';

const LANGS = ['en', 'sr'] as const;

export function Header() {
  const { isAuthenticated, logout, initiateLogin } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const switchLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <header className={styles.wrapper}>
      <div className={styles.pill}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoMark}>R</span>
          <span className={styles.logoText}>Reserva</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/businesses">{t('nav.browse')}</Link>
          <a href="#how-it-works">{t('nav.howItWorks')}</a>
          <Link to="/dashboard">{t('nav.forBusinesses')}</Link>
        </nav>
        <div className={styles.right}>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className={styles.quietLink}>
                {t('nav.dashboard')}
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                {t('nav.signOut')}
              </button>
            </>
          ) : (
            <>
              <button className={styles.quietLink} onClick={initiateLogin}>
                {t('nav.signIn')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
                {t('nav.getStarted')}
              </button>
            </>
          )}
          <div className={styles.langSwitch}>
            {LANGS.map((lang) => (
              <button
                key={lang}
                className={[styles.langBtn, i18n.language === lang ? styles.langBtnActive : ''].join(' ')}
                onClick={() => switchLang(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
