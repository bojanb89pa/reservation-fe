import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './DashboardLayout.module.css';

interface NavItem {
  to: string;
  label: string;
  badge?: number;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/businesses', label: 'My businesses' },
  { to: '/dashboard/reservations', label: 'Reservations' },
];

export function DashboardLayout() {
  const { logout } = useAuth();

  return (
    <div className={styles.app}>
      <aside className={styles.side}>
        <div className={styles.brand}>
          <div className={styles.logoMark}>R</div>
          <div>
            <div className={styles.brandName}>Reserva</div>
            <div className={styles.brandSub}>Business dashboard</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>Manage</div>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')
              }
            >
              {item.label}
              {item.badge !== undefined && <span className={styles.navBadge}>{item.badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={styles.foot}>
          <button className={styles.footBtn} onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
