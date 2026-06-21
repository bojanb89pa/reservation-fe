import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDiscoverySearch } from '../hooks/useDiscoverySearch';
import styles from './SearchResultsPage.module.css';

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const [whatInput, setWhatInput] = useState(searchParams.get('q') ?? '');
  const [whereInput, setWhereInput] = useState(searchParams.get('city') ?? '');
  const [debouncedWhat, setDebouncedWhat] = useState(whatInput);
  const [debouncedWhere, setDebouncedWhere] = useState(whereInput);
  const [page, setPage] = useState(0);
  const whatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const whereRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (whatRef.current) clearTimeout(whatRef.current);
    whatRef.current = setTimeout(() => {
      setDebouncedWhat(whatInput);
      setPage(0);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (whatInput.trim()) next.set('q', whatInput.trim());
        else next.delete('q');
        return next;
      });
    }, 300);
    return () => {
      if (whatRef.current) clearTimeout(whatRef.current);
    };
  }, [whatInput, setSearchParams]);

  useEffect(() => {
    if (whereRef.current) clearTimeout(whereRef.current);
    whereRef.current = setTimeout(() => {
      setDebouncedWhere(whereInput);
      setPage(0);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (whereInput.trim()) next.set('city', whereInput.trim());
        else next.delete('city');
        return next;
      });
    }, 300);
    return () => {
      if (whereRef.current) clearTimeout(whereRef.current);
    };
  }, [whereInput, setSearchParams]);

  const { data, isLoading, isError } = useDiscoverySearch(
    { q: debouncedWhat, city: debouncedWhere || undefined },
    page,
    20,
  );

  const isEmpty = debouncedWhat.trim().length === 0;

  return (
    <div className={styles.page}>
      <div className="eyebrow-rule">{t('search.eyebrow')}</div>
      <h1 className="section-title">
        {data
          ? t('search.titleWithCount', { count: data.totalElements, q: debouncedWhat })
          : isEmpty
            ? t('search.titleEmpty')
            : t('search.titleLoading')}
      </h1>

      <div className={styles.searchBar}>
        <div className={styles.searchField}>
          <span className={styles.searchLabel}>{t('search.what')}</span>
          <input
            className={styles.searchInput}
            placeholder={t('search.whatPlaceholder')}
            value={whatInput}
            onChange={(e) => setWhatInput(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.searchDivider} />
        <div className={styles.searchField}>
          <span className={styles.searchLabel}>{t('search.where')}</span>
          <input
            className={styles.searchInput}
            placeholder={t('search.wherePlaceholder')}
            value={whereInput}
            onChange={(e) => setWhereInput(e.target.value)}
          />
        </div>
      </div>

      {isEmpty && <p className={styles.hint}>{t('search.hint')}</p>}

      {!isEmpty && isLoading && (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      )}

      {!isEmpty && isError && <div className="error-box">{t('search.error')}</div>}

      {data && data.content.length === 0 && (
        <p className={styles.noResults}>{t('search.noResults', { q: debouncedWhat })}</p>
      )}

      {data && data.content.length > 0 && (
        <>
          <ul className={styles.results}>
            {data.content.map((r) => (
              <li key={r.businessId} className={styles.resultItem}>
                <Link to={`/businesses/${r.businessId}`} className={styles.resultLink}>
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
