import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { BusinessCategory } from '@domain';
import { DEFAULT_CATEGORY_COLOR } from '@domain';
import { BusinessImage } from './BusinessImage';
import styles from './BusinessCard.module.css';

/** Subset shared by Business and NearbyBusiness — the only fields this card renders. */
interface BusinessCardBusiness {
  id: string | null;
  name: string;
  category: BusinessCategory | null;
  imageUrl: string | null;
}

interface Props {
  business: BusinessCardBusiness;
  /** Distance from the search origin, in kilometers. Shown only for nearby-search results. */
  distanceKm?: number;
}

export function BusinessCard({ business, distanceKm }: Props) {
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
          {distanceKm !== undefined && (
            <span className={styles.distance}>
              {t('businessCard.distance', { distanceKm: distanceKm.toFixed(1) })}
            </span>
          )}
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
