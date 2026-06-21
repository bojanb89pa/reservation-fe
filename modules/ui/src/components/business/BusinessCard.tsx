import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Business } from '@domain';
import { DEFAULT_CATEGORY_COLOR } from '@domain';
import styles from './BusinessCard.module.css';

interface Props {
  business: Business;
}

const GRADIENTS = [
  'radial-gradient(120% 140% at 20% 0%,#7C7CF8 0%,#3B3B7A 55%,#15162B 100%)',
  'radial-gradient(120% 140% at 80% 0%,#FF8A7A 0%,#7A3E48 55%,#241222 100%)',
  'radial-gradient(120% 140% at 20% 0%,#3EE6C4 0%,#1E5E58 55%,#0B1B22 100%)',
  'radial-gradient(120% 140% at 80% 0%,#FFD166 0%,#7A6232 55%,#211A12 100%)',
  'radial-gradient(120% 140% at 50% 0%,#67D6FF 0%,#2E4E7A 55%,#10142B 100%)',
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
      <div className={styles.imageWrap}>
        <div className={styles.image} style={{ background: getGradient(business.id) }} />
      </div>
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
