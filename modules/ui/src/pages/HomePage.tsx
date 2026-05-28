import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Translation } from '../i18n/locales/en';
import { useSearchBusinesses } from '../hooks/useBusinesses';
import { BusinessCard } from '../components/business/BusinessCard';
import styles from './HomePage.module.css';

type ResourceTypeId = keyof Translation['home']['resourceTypes'];

const RESOURCE_TYPE_IDS: ResourceTypeId[] = [
  'EMPLOYEE',
  'ROOM',
  'APARTMENT',
  'TABLE',
  'COURT',
  'VEHICLE',
];

const ICONS: Record<ResourceTypeId, string> = {
  EMPLOYEE: '✂',
  ROOM: '🚪',
  APARTMENT: '🏠',
  TABLE: '🪑',
  COURT: '🎾',
  VEHICLE: '🚗',
};

const COLORS: Record<ResourceTypeId, { color: string; bg: string }> = {
  EMPLOYEE: { color: '#4F46E5', bg: '#EEF2FF' },
  ROOM: { color: '#FF6F61', bg: '#FFF1EF' },
  APARTMENT: { color: '#00C2A8', bg: '#E6FAF8' },
  TABLE: { color: '#FFC83D', bg: '#FFFBEB' },
  COURT: { color: '#4F46E5', bg: '#EEF2FF' },
  VEHICLE: { color: '#FF6F61', bg: '#FFF1EF' },
};

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [what, setWhat] = useState('');
  const [where, setWhere] = useState('');
  const { data: businesses, isLoading } = useSearchBusinesses('', 0, 6);

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
          <div className="eyebrow-rule">{t('home.eyebrow')}</div>
          <h1 className={styles.heroTitle}>
            {t('home.heroTitle')
              .split('\n')
              .map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
          </h1>
          <p className={styles.heroSub}>{t('home.heroSub')}</p>

          <div className={styles.search}>
            <div className={styles.searchField}>
              <span className={styles.searchLabel}>{t('home.searchWhat')}</span>
              <input
                placeholder={t('home.searchWhatPlaceholder')}
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className={styles.searchDivider} />
            <div className={styles.searchField}>
              <span className={styles.searchLabel}>{t('home.searchWhere')}</span>
              <input
                placeholder={t('home.searchWherePlaceholder')}
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
        <div className="eyebrow-rule">{t('home.categoryEyebrow')}</div>
        <h2 className="section-title">{t('home.categoryTitle')}</h2>
        <div className={styles.categoryGrid}>
          {RESOURCE_TYPE_IDS.map((id) => {
            const { color, bg } = COLORS[id];
            return (
              <button
                key={id}
                className={styles.categoryCard}
                onClick={() => navigate(`/businesses?type=${id}`)}
              >
                <div className={styles.categoryIcon} style={{ background: bg, color }}>
                  {ICONS[id]}
                </div>
                <span className={styles.categoryName}>{t(`home.resourceTypes.${id}.label`)}</span>
                <span className={styles.categoryCount}>{t(`home.resourceTypes.${id}.count`)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className="eyebrow-rule">{t('home.browseEyebrow')}</div>
        <h2 className="section-title">{t('home.browseTitle')}</h2>
        {isLoading ? (
          <div className="page-loading">
            <div className="spinner" />
          </div>
        ) : (
          <div className={styles.listingGrid}>
            {businesses?.content?.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
            {!businesses?.content?.length && (
              <p style={{ color: 'var(--ink-500)', fontSize: 'var(--text-sm)' }}>
                {t('home.noBusinessPrefix')}
                <a href="/dashboard" style={{ color: 'var(--primary)' }}>
                  {t('home.noBusinessLink')}
                </a>
              </p>
            )}
          </div>
        )}
        {businesses && businesses.totalPages > 1 && (
          <div style={{ marginTop: 28 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/businesses')}>
              {t('home.seeAll')}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
