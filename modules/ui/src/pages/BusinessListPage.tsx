import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearchBusinesses } from '../hooks/useBusinesses';
import { BusinessCard } from '../components/business/BusinessCard';
import styles from './BusinessListPage.module.css';

export function BusinessListPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeType = searchParams.get('type') ?? '';
  const { t } = useTranslation();

  const RESOURCE_TYPES = [
    { id: '', label: t('businessList.filterAll') },
    { id: 'EMPLOYEE', label: t('home.resourceTypes.EMPLOYEE.label') },
    { id: 'ROOM', label: t('home.resourceTypes.ROOM.label') },
    { id: 'APARTMENT', label: t('home.resourceTypes.APARTMENT.label') },
    { id: 'TABLE', label: t('home.resourceTypes.TABLE.label') },
    { id: 'COURT', label: t('home.resourceTypes.COURT.label') },
    { id: 'VEHICLE', label: t('home.resourceTypes.VEHICLE.label') },
  ];

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const { data, isLoading, isError } = useSearchBusinesses(debouncedSearch, page, 12);

  return (
    <div className={styles.page}>
      <div className="eyebrow-rule">{t('businessList.eyebrow')}</div>
      <h1 className="section-title">
        {data
          ? t('businessList.titleWithCount', { count: data.totalElements })
          : t('businessList.titleNoCount')}
      </h1>

      <div className={styles.searchRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={t('businessList.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className={styles.filters}>
        {RESOURCE_TYPES.map((rt) => (
          <a
            key={rt.id}
            href={`/businesses${rt.id ? `?type=${rt.id}` : ''}`}
            className={['chip', activeType === rt.id ? 'active' : ''].join(' ')}
          >
            {rt.label}
          </a>
        ))}
        {data && (
          <span className={styles.filterCount}>
            {t('businessList.resultsCount', { count: data.totalElements })}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      )}

      {isError && <div className="error-box">{t('businessList.error')}</div>}

      {data && (
        <>
          <div className={styles.grid}>
            {data.content.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>

          {data.content.length === 0 && (
            <p style={{ color: 'var(--ink-500)' }}>{t('businessList.noResults')}</p>
          )}

          {data.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('businessList.prevPage')}
              </button>
              <span
                className="mono"
                style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-500)' }}
              >
                {t('businessList.pageOf', { page: page + 1, total: data.totalPages })}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page + 1 >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('businessList.nextPage')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
