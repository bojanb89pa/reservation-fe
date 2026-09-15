import { useTranslation } from 'react-i18next';
import type { NearbyBusiness, PageResponse } from '@domain';
import { BusinessCard } from './BusinessCard';
import styles from './NearbyBusinessesList.module.css';

interface Props {
  data: PageResponse<NearbyBusiness>;
  page: number;
  onPageChange: (page: number) => void;
}

export function NearbyBusinessesList({ data, page, onPageChange }: Props) {
  const { t } = useTranslation();

  if (data.content.length === 0) {
    return <p className={styles.empty}>{t('nearbyBusinesses.noResults')}</p>;
  }

  return (
    <>
      <div className={styles.grid}>
        {data.content.map((business) => (
          <BusinessCard key={business.id} business={business} distanceKm={business.distanceKm} />
        ))}
      </div>

      {data.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            {t('nearbyBusinesses.prevPage')}
          </button>
          <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-500)' }}>
            {t('nearbyBusinesses.pageOf', { page: page + 1, total: data.totalPages })}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page + 1 >= data.totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t('nearbyBusinesses.nextPage')}
          </button>
        </div>
      )}
    </>
  );
}
