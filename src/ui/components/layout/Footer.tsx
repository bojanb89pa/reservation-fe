import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoMark}>R</span>
            <span className={styles.logoText}>Reserva</span>
          </Link>
          <p className={styles.tagline}>Find a place. Hold a slot.</p>
        </div>
        <div className={styles.cols}>
          <div>
            <h5 className={styles.colHead}>Browse</h5>
            <Link to="/businesses?type=EMPLOYEE">Salons &amp; Staff</Link>
            <Link to="/businesses?type=VEHICLE">Vehicles</Link>
            <Link to="/businesses?type=APARTMENT">Apartments</Link>
            <Link to="/businesses?type=ROOM">Rooms</Link>
          </div>
          <div>
            <h5 className={styles.colHead}>Reserva</h5>
            <a href="#how-it-works">How it works</a>
            <Link to="/dashboard">For businesses</Link>
            <a href="#">Press</a>
          </div>
          <div>
            <h5 className={styles.colHead}>Info</h5>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Help</a>
          </div>
        </div>
      </div>
      <div className={styles.rule} />
      <p className={styles.fine}>© Reserva — Made with care.</p>
    </footer>
  );
}
