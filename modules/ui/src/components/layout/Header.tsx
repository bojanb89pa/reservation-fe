import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useHasActiveBusiness } from '../../hooks/useBusinesses';
import styles from './Header.module.css';

const LANGS = ['en', 'sr'] as const;

const BUSINESS_PATHS = ['/business-onboarding'];

export function Header() {
  const { isAuthenticated, logout, initiateLogin } = useAuth();
  const hasActiveBusiness = useHasActiveBusiness();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const isBusinessPage = BUSINESS_PATHS.some((p) => pathname.startsWith(p));

  const forBusinessesPath = isAuthenticated
    ? hasActiveBusiness
      ? '/dashboard'
      : '/business-onboarding'
    : '/register';

  const switchLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <header className={styles.wrapper}>
      <div className={styles.pill}>
        <Link to="/" className={styles.logo}>
          <span
            className={[styles.logoMark, isBusinessPage ? styles.logoMarkBusiness : '']
              .join(' ')
              .trim()}
          >
            R
          </span>
          <span className={styles.logoText}>Reserva</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/businesses">{t('nav.browse')}</Link>
          <Link to={forBusinessesPath}>{t('nav.forBusinesses')}</Link>
        </nav>
        <div className={styles.right}>
          {isAuthenticated ? (
            <>
              <Link to="/my-reservations" className={styles.quietLink}>
                {t('nav.myReservations')}
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
                className={[
                  styles.langBtn,
                  i18n.language === lang ? styles.langBtnActive : '',
                ].join(' ')}
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
