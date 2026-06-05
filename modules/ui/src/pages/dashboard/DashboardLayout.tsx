import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useIsAdmin } from '../../hooks/useAuth';
import { useMyBusinesses } from '../../hooks/useBusinesses';
import styles from './DashboardLayout.module.css';

interface NavItem {
  to: string;
  labelKey: string;
  badge?: number;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'dashboard.overview', end: true },
  { to: '/dashboard/businesses', labelKey: 'dashboard.myBusinesses' },
  { to: '/dashboard/categories', labelKey: 'dashboard.categories' },
  { to: '/dashboard/reservations', labelKey: 'dashboard.reservations' },
];

export function DashboardLayout() {
  const { logout } = useAuth();
  const { t, i18n } = useTranslation();
  const isAdmin = useIsAdmin();
  const { data: myBusinesses, isLoading: checkingBusinesses } = useMyBusinesses(0, 50);

  if (!isAdmin) {
    if (checkingBusinesses) {
      return (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      );
    }
    const hasActive = (myBusinesses?.content ?? []).some((b) => b.status === 'ACTIVE');
    if (!hasActive) {
      return <Navigate to="/business-onboarding" replace />;
    }
  }

  return (
    <div className={styles.app}>
      <aside className={styles.side}>
        <div className={styles.brand}>
          <div className={styles.logoMark}>R</div>
          <div>
            <div className={styles.brandName}>Reserva</div>
            <div className={styles.brandSub}>{t('dashboard.brand')}</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>{t('dashboard.navSection')}</div>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')
              }
            >
              {t(item.labelKey)}
              {item.badge !== undefined && <span className={styles.navBadge}>{item.badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={styles.foot}>
          <div className={styles.langSwitch}>
            {(['en', 'sr'] as const).map((lang) => (
              <button
                key={lang}
                className={[styles.langBtn, i18n.language === lang ? styles.langBtnActive : ''].join(' ')}
                onClick={() => { i18n.changeLanguage(lang); localStorage.setItem('lang', lang); }}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <button className={styles.footBtn} onClick={logout}>
            {t('dashboard.signOut')}
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
