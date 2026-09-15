import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '../hooks/useGeolocation';
import { useNearbyBusinesses } from '../hooks/useNearbyBusinesses';
import { useBusinessCategories } from '../hooks/useBusinessCategories';
import { NearbyBusinessesList } from '../components/business/NearbyBusinessesList';
import styles from './NearbyBusinessesPage.module.css';

export function NearbyBusinessesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [categoryId, setCategoryId] = useState('');

  const { latitude, longitude, error: geoError } = useGeolocation();
  const { data: categories = [] } = useBusinessCategories();

  const { data, isLoading, isError } = useNearbyBusinesses(
    latitude,
    longitude,
    categoryId || undefined,
    page,
    12,
  );

  const handleCategoryClick = (id: string) => {
    setCategoryId(id);
    setPage(0);
  };

  const hasPosition = latitude !== null && longitude !== null;

  return (
    <div className={styles.page}>
      <div className="eyebrow-rule">{t('nearbyBusinesses.eyebrow')}</div>
      <h1 className="section-title">
        {data
          ? t('nearbyBusinesses.titleWithCount', { count: data.totalElements })
          : t('nearbyBusinesses.titleNoCount')}
      </h1>

      <div className={styles.filters}>
        <button
          className={['chip', categoryId === '' ? 'active' : ''].join(' ')}
          onClick={() => handleCategoryClick('')}
        >
          {t('nearbyBusinesses.filterAll')}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={['chip', categoryId === category.id ? 'active' : ''].join(' ')}
            onClick={() => handleCategoryClick(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {geoError && <div className="error-box">{t(`nearbyBusinesses.geoError.${geoError}`)}</div>}

      {!geoError && !hasPosition && (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      )}

      {hasPosition && (
        <>
          {isLoading && (
            <div className="page-loading">
              <div className="spinner" />
            </div>
          )}

          {isError && <div className="error-box">{t('nearbyBusinesses.error')}</div>}

          {data && <NearbyBusinessesList data={data} page={page} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
