import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinesses } from '../hooks/useBusinesses';
import { BusinessCard } from '../components/business/BusinessCard';
import styles from './HomePage.module.css';

const RESOURCE_TYPES = [
  { id: 'EMPLOYEE', label: 'Salons & Staff', count: '1,309 nearby', color: '#4F46E5', bg: '#EEF2FF' },
  { id: 'ROOM',     label: 'Rooms',          count: '412 nearby',   color: '#FF6F61', bg: '#FFF1EF' },
  { id: 'APARTMENT',label: 'Apartments',     count: '876 nearby',   color: '#00C2A8', bg: '#E6FAF8' },
  { id: 'TABLE',    label: 'Tables',         count: '289 nearby',   color: '#FFC83D', bg: '#FFFBEB' },
  { id: 'COURT',    label: 'Courts',         count: '98 nearby',    color: '#4F46E5', bg: '#EEF2FF' },
  { id: 'VEHICLE',  label: 'Vehicles',       count: '204 nearby',   color: '#FF6F61', bg: '#FFF1EF' },
];

const ICONS: Record<string, string> = {
  EMPLOYEE: '✂',
  ROOM: '🚪',
  APARTMENT: '🏠',
  TABLE: '🪑',
  COURT: '🎾',
  VEHICLE: '🚗',
};

export function HomePage() {
  const navigate = useNavigate();
  const [what, setWhat] = useState('');
  const [where, setWhere] = useState('');
  const { data: businesses, isLoading } = useBusinesses(0, 6);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (what) params.set('q', what);
    if (where) params.set('location', where);
    navigate(`/businesses?${params.toString()}`);
  };

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.blob3} />
        <div className={styles.heroInner}>
          <div className="eyebrow-rule">Find · hold · book</div>
          <h1 className={styles.heroTitle}>
            The smartest way<br />to book anything.
          </h1>
          <p className={styles.heroSub}>
            Reserva connects you with local businesses near you — by the slot or the
            hour. No payment until they say yes.
          </p>

          <div className={styles.search}>
            <div className={styles.searchField}>
              <span className={styles.searchLabel}>What</span>
              <input
                placeholder="Salon, dentist, studio…"
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className={styles.searchDivider} />
            <div className={styles.searchField}>
              <span className={styles.searchLabel}>Where</span>
              <input
                placeholder="City or neighbourhood"
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button className={styles.searchGo} onClick={handleSearch} aria-label="Search">
              →
            </button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="eyebrow-rule">What kind of place?</div>
        <h2 className="section-title">Pick a category to begin.</h2>
        <div className={styles.categoryGrid}>
          {RESOURCE_TYPES.map((rt) => (
            <button
              key={rt.id}
              className={styles.categoryCard}
              onClick={() => navigate(`/businesses?type=${rt.id}`)}
            >
              <div
                className={styles.categoryIcon}
                style={{ background: rt.bg, color: rt.color }}
              >
                {ICONS[rt.id]}
              </div>
              <span className={styles.categoryName}>{rt.label}</span>
              <span className={styles.categoryCount}>{rt.count}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className="eyebrow-rule">Browse all</div>
        <h2 className="section-title">Businesses near you.</h2>
        {isLoading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : (
          <div className={styles.listingGrid}>
            {businesses?.content?.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
            {!businesses?.content?.length && (
              <p style={{ color: 'var(--ink-500)', fontSize: 'var(--text-sm)' }}>
                No businesses yet. Be the first to&nbsp;
                <a href="/dashboard" style={{ color: 'var(--primary)' }}>list yours.</a>
              </p>
            )}
          </div>
        )}
        {businesses && businesses.totalPages > 1 && (
          <div style={{ marginTop: 28 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/businesses')}>
              See all businesses →
            </button>
          </div>
        )}
      </section>
    </>
  );
}
