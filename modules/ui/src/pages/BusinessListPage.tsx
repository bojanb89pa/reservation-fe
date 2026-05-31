import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearchBusinesses } from '../hooks/useBusinesses';
import { useBusinessCategories } from '../hooks/useBusinessCategories';
import { BusinessCard } from '../components/business/BusinessCard';
import styles from './BusinessListPage.module.css';

export function BusinessListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCategoryId = searchParams.get('category') ?? '';
  const { t } = useTranslation();

  const { data: categories = [] } = useBusinessCategories();

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

  useEffect(() => {
    setPage(0);
  }, [activeCategoryId]);

  const { data, isLoading, isError } = useSearchBusinesses(
    {
      query: debouncedSearch,
      categoryIds: activeCategoryId ? [activeCategoryId] : undefined,
    },
    page,
    12,
  );

  const handleCategoryClick = (categoryId: string) => {
    setSearchParams(categoryId ? { category: categoryId } : {});
  };

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
        <button
          className={['chip', activeCategoryId === '' ? 'active' : ''].join(' ')}
          onClick={() => handleCategoryClick('')}
        >
          {t('businessList.filterAll')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={['chip', activeCategoryId === cat.id ? 'active' : ''].join(' ')}
            onClick={() => handleCategoryClick(cat.id)}
          >
            {cat.name}
          </button>
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
