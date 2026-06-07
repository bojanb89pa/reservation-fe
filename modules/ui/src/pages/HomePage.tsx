import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CATEGORY_SYMBOL, DEFAULT_CATEGORY_COLOR } from '@domain';
import { useSearchBusinesses } from '../hooks/useBusinesses';
import { useBusinessCategories } from '../hooks/useBusinessCategories';
import { BusinessCard } from '../components/business/BusinessCard';
import styles from './HomePage.module.css';

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [what, setWhat] = useState('');
  const [where, setWhere] = useState('');
  const { data: businesses, isLoading } = useSearchBusinesses({}, 0, 6);
  const { data: categories = [] } = useBusinessCategories();

  const handleSearch = () => {
    if (!what.trim()) return;
    const params = new URLSearchParams({ q: what.trim() });
    if (where.trim()) params.set('city', where.trim());
    navigate(`/search?${params.toString()}`);
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
          {categories
            .filter((c) => c.parentId === null)
            .map((c) => {
              const symbol = c.symbol ?? DEFAULT_CATEGORY_SYMBOL;
              const color = c.color ?? DEFAULT_CATEGORY_COLOR;
              return (
                <button
                  key={c.id}
                  className={styles.categoryCard}
                  onClick={() => navigate(`/businesses/category/${c.id}`)}
                >
                  <div className={styles.categoryIcon} style={{ background: `${color}1A`, color }}>
                    {symbol}
                  </div>
                  <span className={styles.categoryName}>{c.name}</span>
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
