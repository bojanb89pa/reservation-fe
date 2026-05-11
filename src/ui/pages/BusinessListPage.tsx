import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBusinesses } from '../hooks/useBusinesses';
import { BusinessCard } from '../components/business/BusinessCard';
import styles from './BusinessListPage.module.css';

const RESOURCE_TYPES = [
  { id: '', label: 'All' },
  { id: 'EMPLOYEE', label: 'Salons & Staff' },
  { id: 'ROOM', label: 'Rooms' },
  { id: 'APARTMENT', label: 'Apartments' },
  { id: 'TABLE', label: 'Tables' },
  { id: 'COURT', label: 'Courts' },
  { id: 'VEHICLE', label: 'Vehicles' },
];

export function BusinessListPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const activeType = searchParams.get('type') ?? '';
  const { data, isLoading, isError } = useBusinesses(page, 12);

  return (
    <div className={styles.page}>
      <div className="eyebrow-rule">Browse</div>
      <h1 className="section-title">
        {data ? `${data.totalElements} businesses near you.` : 'Businesses near you.'}
      </h1>

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
            {data.totalElements} results
          </span>
        )}
      </div>

      {isLoading && (
        <div className="page-loading"><div className="spinner" /></div>
      )}

      {isError && (
        <div className="error-box">Failed to load businesses. Please try again.</div>
      )}

      {data && (
        <>
          <div className={styles.grid}>
            {data.content.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>

          {data.content.length === 0 && (
            <p style={{ color: 'var(--ink-500)' }}>No businesses found.</p>
          )}

          {data.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-500)' }}>
                Page {page + 1} of {data.totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page + 1 >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
