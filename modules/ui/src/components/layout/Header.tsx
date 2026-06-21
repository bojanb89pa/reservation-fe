import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useHasActiveBusiness } from '../../hooks/useBusinesses';
import styles from './Header.module.css';

const LANGS = ['en', 'sr'] as const;

const BUSINESS_PATHS = ['/business-onboarding'];

type Theme = 'dark' | 'light';

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private mode */
    }
    setTheme(next);
  };

  return (
    <button
      className={className}
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? (
        /* sun — thin stroke */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M19.07 4.93l-1.77 1.77M6.7 17.3l-1.77 1.77M19.07 19.07l-1.77-1.77M6.7 6.7 4.93 4.93"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        /* moon — thin stroke */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export function Header() {
  const { isAuthenticated, logout, initiateLogin } = useAuth();
  const hasActiveBusiness = useHasActiveBusiness();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const isBusinessPage = BUSINESS_PATHS.some((p) => pathname.startsWith(p));
  const [menuOpen, setMenuOpen] = useState(false);

  const forBusinessesPath = isAuthenticated
    ? hasActiveBusiness
      ? '/dashboard'
      : '/business-onboarding'
    : '/register';

  const switchLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={styles.wrapper}>
      <div className={styles.pill}>
        <Link to="/" className={styles.logo} onClick={closeMenu}>
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
          <ThemeToggle className={styles.themeBtn} />
        </div>
        <button
          className={styles.menuBtn}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 6h14M3 10h14M3 14h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <nav className={styles.mobileNav}>
            <Link to="/businesses" onClick={closeMenu}>
              {t('nav.browse')}
            </Link>
            <Link to={forBusinessesPath} onClick={closeMenu}>
              {t('nav.forBusinesses')}
            </Link>
          </nav>
          <div className={styles.mobileActions}>
            {isAuthenticated ? (
              <>
                <Link to="/my-reservations" className={styles.mobileActionLink} onClick={closeMenu}>
                  {t('nav.myReservations')}
                </Link>
                <button
                  className={styles.mobileActionLink}
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                >
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <>
                <button
                  className={styles.mobileActionLink}
                  onClick={() => {
                    initiateLogin();
                    closeMenu();
                  }}
                >
                  {t('nav.signIn')}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    navigate('/register');
                    closeMenu();
                  }}
                >
                  {t('nav.getStarted')}
                </button>
              </>
            )}
          </div>
          <div className={styles.mobileLang}>
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
            <ThemeToggle className={styles.themeBtn} />
          </div>
        </div>
      )}
    </header>
  );
}
