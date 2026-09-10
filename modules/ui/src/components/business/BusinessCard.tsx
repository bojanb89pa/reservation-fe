import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Business } from '@domain';
import { DEFAULT_CATEGORY_COLOR } from '@domain';
import { BusinessImage } from './BusinessImage';
import styles from './BusinessCard.module.css';

interface Props {
  business: Business;
}

export function BusinessCard({ business }: Props) {
  const { t } = useTranslation();

  return (
    <Link to={`/businesses/${business.id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <BusinessImage
          name={business.name}
          imageUrl={business.imageUrl}
          seed={business.id}
          variant="card"
        >
          <h3 className={styles.title}>{business.name}</h3>
        </BusinessImage>
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className="badge badge-avail">
            <span className="dot" />
            {t('businessCard.available')}
          </span>
        </div>
        {business.category && (
          <span
            className={styles.categoryChip}
            style={{ backgroundColor: business.category.color ?? DEFAULT_CATEGORY_COLOR }}
          >
            {business.category.symbol && <span>{business.category.symbol}</span>}
            {business.category.name}
          </span>
        )}
        <div className={styles.footer}>
          <span className={styles.cta}>{t('businessCard.viewResources')}</span>
        </div>
      </div>
    </Link>
  );
}
