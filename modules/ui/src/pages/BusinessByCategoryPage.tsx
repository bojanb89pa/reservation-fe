import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusinessesByCategory } from '../hooks/useBusinesses';
import { useBusinessCategories } from '../hooks/useBusinessCategories';
import { BusinessCard } from '../components/business/BusinessCard';
import styles from './BusinessByCategoryPage.module.css';

export function BusinessByCategoryPage() {
  const { categoryId = '' } = useParams<{ categoryId: string }>();
  const [page, setPage] = useState(0);
  const { t } = useTranslation();

  const { data: categories = [] } = useBusinessCategories();
  const category = categories.find((c) => c.id === categoryId);

  const { data, isLoading, isError } = useBusinessesByCategory(categoryId, page, 12);

  return (
    <div className={styles.page}>
      <div className="eyebrow-rule">{category?.name ?? t('businessByCategory.eyebrow')}</div>
      <h1 className="section-title">
        {data
          ? t('businessByCategory.titleWithCount', { count: data.totalElements })
          : t('businessByCategory.titleNoCount')}
      </h1>

      {isLoading && (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      )}

      {isError && <div className="error-box">{t('businessByCategory.error')}</div>}

      {data && (
        <>
          <div className={styles.grid}>
            {data.content.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>

          {data.content.length === 0 && (
            <p style={{ color: 'var(--ink-500)' }}>{t('businessByCategory.noResults')}</p>
          )}

          {data.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('businessByCategory.prevPage')}
              </button>
              <span
                className="mono"
                style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-500)' }}
              >
                {t('businessByCategory.pageOf', { page: page + 1, total: data.totalPages })}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page + 1 >= (data.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('businessByCategory.nextPage')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
