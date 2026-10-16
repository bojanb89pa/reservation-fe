import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDiscoverySearch } from '../hooks/useDiscoverySearch';
import { SearchAutocomplete } from '../components/search/SearchAutocomplete';
import { ErrorState } from '../components/ErrorState';
import { BusinessImage } from '../components/business/BusinessImage';
import styles from './SearchResultsPage.module.css';

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const q = searchParams.get('q') ?? '';
  const city = searchParams.get('city') ?? '';
  const [input, setInput] = useState(q);
  const [page, setPage] = useState(0);

  // Keep the field and paging in step with the URL (place suggestions navigate here with new params).
  useEffect(() => {
    setInput(q);
    setPage(0);
  }, [q, city]);

  const handleSubmit = () => {
    // Free search: a previously selected city is dropped.
    const next = new URLSearchParams();
    if (input.trim()) next.set('q', input.trim());
    setSearchParams(next);
  };

  const { data, isLoading, isError, refetch, isRefetching } = useDiscoverySearch(
    { q, city: city || undefined },
    page,
    20,
  );

  const isEmpty = q.trim().length === 0;

  return (
    <div className={styles.page}>
      <div className="eyebrow-rule">{t('search.eyebrow')}</div>
      <h1 className="section-title">
        {data
          ? t('search.titleWithCount', { count: data.totalElements, q })
          : isEmpty
            ? t('search.titleEmpty')
            : t('search.titleLoading')}
      </h1>

      <div className={styles.searchBar}>
        <div className={styles.searchField}>
          <span className={styles.searchLabel}>{t('search.what')}</span>
          <SearchAutocomplete
            label={t('search.what')}
            placeholder={t('search.whatPlaceholder')}
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      {isEmpty && <p className={styles.hint}>{t('search.hint')}</p>}

      {!isEmpty && isLoading && (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      )}

      {!isEmpty && isError && (
        <ErrorState message={t('search.error')} onRetry={refetch} isRetrying={isRefetching} />
      )}

      {data && data.content.length === 0 && (
        <p className={styles.noResults}>{t('search.noResults', { q })}</p>
      )}

      {data && data.content.length > 0 && (
        <>
          <ul className={styles.results}>
            {data.content.map((r) => (
              <li key={r.businessId} className={styles.resultItem}>
                <Link to={`/businesses/${r.businessId}`} className={styles.resultLink}>
                  <div className={styles.resultThumb}>
                    <BusinessImage
                      name={r.businessName}
                      imageUrl={r.imageUrl}
                      seed={r.businessId}
                      variant="card"
                    />
                  </div>
                  <span className={styles.resultName}>{r.businessName}</span>
                  {r.city && <span className={styles.resultCity}>{r.city}</span>}
                </Link>
              </li>
            ))}
          </ul>

          {data.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('search.prevPage')}
              </button>
              <span
                className="mono"
                style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-500)' }}
              >
                {t('search.pageOf', { page: page + 1, total: data.totalPages })}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page + 1 >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('search.nextPage')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
