import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoMark}>R</span>
            <span className={styles.logoText}>Reserva</span>
          </Link>
          <p className={styles.tagline}>{t('footer.tagline')}</p>
        </div>
        <div className={styles.cols}>
          <div>
            <h5 className={styles.colHead}>{t('footer.browse')}</h5>
            <Link to="/businesses?type=EMPLOYEE">{t('footer.salons')}</Link>
            <Link to="/businesses?type=VEHICLE">{t('footer.vehicles')}</Link>
            <Link to="/businesses?type=APARTMENT">{t('footer.apartments')}</Link>
            <Link to="/businesses?type=ROOM">{t('footer.rooms')}</Link>
          </div>
          <div>
            <h5 className={styles.colHead}>{t('footer.reserva')}</h5>
            <a href="#how-it-works">{t('footer.howItWorks')}</a>
            <Link to="/dashboard">{t('footer.forBusinesses')}</Link>
            <a href="#">{t('footer.press')}</a>
          </div>
          <div>
            <h5 className={styles.colHead}>{t('footer.info')}</h5>
            <a href="#">{t('footer.privacy')}</a>
            <a href="#">{t('footer.terms')}</a>
            <a href="#">{t('footer.help')}</a>
          </div>
        </div>
      </div>
      <div className={styles.rule} />
      <p className={styles.fine}>{t('footer.copyright')}</p>
    </footer>
  );
}
