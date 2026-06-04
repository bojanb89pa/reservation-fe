import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Business } from '@domain';
import { DEFAULT_CATEGORY_COLOR } from '@domain';
import styles from './BusinessCard.module.css';

interface Props {
  business: Business;
}

const GRADIENTS = [
  'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)',
  'linear-gradient(135deg,#FF6F61 0%,#FF8C42 100%)',
  'linear-gradient(135deg,#00C2A8 0%,#0891B2 100%)',
  'linear-gradient(135deg,#FFC83D 0%,#F59E0B 100%)',
  'linear-gradient(135deg,#4F46E5 0%,#00C2A8 100%)',
];

function getGradient(id: string | null): string {
  if (!id) return GRADIENTS[0]!;
  const index = id.charCodeAt(0) % GRADIENTS.length;
  return GRADIENTS[index]!;
}

export function BusinessCard({ business }: Props) {
  const { t } = useTranslation();

  return (
    <Link to={`/businesses/${business.id}`} className={styles.card}>
      <div className={styles.image} style={{ background: getGradient(business.id) }} />
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className="badge badge-avail">
            <span className="dot" />
            {t('businessCard.available')}
          </span>
        </div>
        <h3 className={styles.title}>{business.name}</h3>
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
