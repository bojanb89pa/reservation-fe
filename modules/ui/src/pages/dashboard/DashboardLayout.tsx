import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
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
  const { t } = useTranslation();

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
