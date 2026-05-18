import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Header.module.css';

export function Header() {
  const { isAuthenticated, logout, initiateLogin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className={styles.wrapper}>
      <div className={styles.pill}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoMark}>R</span>
          <span className={styles.logoText}>Reserva</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/businesses">Browse</Link>
          <a href="#how-it-works">How it works</a>
          <Link to="/dashboard">For businesses</Link>
        </nav>
        <div className={styles.right}>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className={styles.quietLink}>Dashboard</Link>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button className={styles.quietLink} onClick={initiateLogin}>
                Sign in
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
                Get started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
