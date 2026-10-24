import { useTranslation } from 'react-i18next';
import { env } from '../../app/container';
import styles from './WidgetWatermark.module.css';

/** Mandatory "by Reserva" mark at the bottom of the widget; part of the measured iframe height. */
export function WidgetWatermark() {
  const { t } = useTranslation();
  return (
    <footer className={styles.watermark}>
      <a
        className={styles.link}
        href={env.appSiteUrl}
        target="_blank"
        rel="noopener"
        aria-label={t('widget.watermark.linkLabel')}
        data-testid="widget-watermark"
      >
        <svg
          className={styles.logo}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="24" height="24" rx="6" fill="var(--accent)" />
          <path
            d="M8 18V6h4.5a3.5 3.5 0 0 1 0 7H8m4.5 0L16 18"
            stroke="var(--bg)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{t('widget.watermark.label')}</span>
      </a>
    </footer>
  );
}
