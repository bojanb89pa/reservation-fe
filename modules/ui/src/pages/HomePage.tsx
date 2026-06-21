import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { DEFAULT_CATEGORY_SYMBOL, DEFAULT_CATEGORY_COLOR } from '@domain';
import { useSearchBusinesses } from '../hooks/useBusinesses';
import { useBusinessCategories } from '../hooks/useBusinessCategories';
import { BusinessCard } from '../components/business/BusinessCard';
import styles from './HomePage.module.css';

// ─── Motion ───────────────────────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.99, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 110, damping: 18, mass: 0.9 },
  },
};

function ListingSkeleton() {
  return (
    <div className={styles.skeletonCard}>
      <div className={`skeleton ${styles.skeletonImage}`} />
      <div className={styles.skeletonBody}>
        <div className="skeleton" style={{ height: 12, width: '36%' }} />
        <div className="skeleton" style={{ height: 22, width: '72%' }} />
        <div className="skeleton" style={{ height: 12, width: '52%' }} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [what, setWhat] = useState('');
  const [where, setWhere] = useState('');
  const { data: businesses, isLoading } = useSearchBusinesses({}, 0, 6);
  const { data: categories = [] } = useBusinessCategories();

  // Subtle scroll parallax — orbs drift slower than content.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const orbY1 = useTransform(scrollY, [0, 600], [0, 90]);
  const orbY2 = useTransform(scrollY, [0, 600], [0, -60]);
  const orbY3 = useTransform(scrollY, [0, 600], [0, 50]);

  const handleSearch = () => {
    if (!what.trim()) return;
    const params = new URLSearchParams({ q: what.trim() });
    if (where.trim()) params.set('city', where.trim());
    navigate(`/search?${params.toString()}`);
  };

  const heroLines = t('home.heroTitle').split('\n');

  return (
    <>
      <section className={styles.hero} ref={heroRef}>
        <div className={styles.gridOverlay} />
        <motion.div
          className={styles.orb1}
          style={prefersReducedMotion ? undefined : { y: orbY1 }}
        />
        <motion.div
          className={styles.orb2}
          style={prefersReducedMotion ? undefined : { y: orbY2 }}
        />
        <motion.div
          className={styles.orb3}
          style={prefersReducedMotion ? undefined : { y: orbY3 }}
        />

        <motion.div className={styles.heroInner} variants={stagger} initial="hidden" animate="show">
          <motion.div variants={rise} className={styles.heroEyebrow}>
            <span className={styles.livePulse} aria-hidden="true" />
            {t('home.eyebrow')}
          </motion.div>

          <motion.h1 variants={rise} className={styles.heroTitle}>
            {heroLines.map((line, i) => (
              <span key={i} className={i === heroLines.length - 1 ? 'grad-text' : undefined}>
                {line}
                {i < heroLines.length - 1 && <br />}
              </span>
            ))}
          </motion.h1>

          <motion.p variants={rise} className={styles.heroSub}>
            {t('home.heroSub')}
          </motion.p>

          <motion.div variants={rise} className={styles.searchShell}>
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
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </motion.div>

          <motion.p variants={rise} className={styles.liveHint}>
            <span className={styles.livePulse} aria-hidden="true" />
            {t('home.liveHint')}
          </motion.p>
        </motion.div>
      </section>

      <section className={styles.section}>
        <div className="eyebrow-rule">{t('home.categoryEyebrow')}</div>
        <h2 className="section-title">{t('home.categoryTitle')}</h2>
        <motion.div
          className={styles.categoryGrid}
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {categories
            .filter((c) => c.parentId === null)
            .map((c) => {
              const symbol = c.symbol ?? DEFAULT_CATEGORY_SYMBOL;
              const color = c.color ?? DEFAULT_CATEGORY_COLOR;
              return (
                <motion.button
                  key={c.id}
                  variants={rise}
                  className={styles.categoryCard}
                  onClick={() => navigate(`/businesses/category/${c.id}`)}
                >
                  <div className={styles.categoryIcon} style={{ background: `${color}1F`, color }}>
                    {symbol}
                  </div>
                  <span className={styles.categoryName}>{c.name}</span>
                  <span className={styles.categoryArrow} aria-hidden="true">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </span>
                </motion.button>
              );
            })}
        </motion.div>
      </section>

      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className="eyebrow-rule">{t('home.browseEyebrow')}</div>
        <h2 className="section-title">{t('home.browseTitle')}</h2>
        {isLoading ? (
          <div className={styles.listingGrid}>
            {Array.from({ length: 6 }, (_, i) => (
              <ListingSkeleton key={i} />
            ))}
          </div>
        ) : (
          <motion.div
            className={styles.listingGrid}
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {businesses?.content?.map((b) => (
              <motion.div key={b.id} variants={rise}>
                <BusinessCard business={b} />
              </motion.div>
            ))}
            {!businesses?.content?.length && (
              <p style={{ color: 'var(--ink-500)', fontSize: 'var(--text-sm)' }}>
                {t('home.noBusinessPrefix')}
                <a href="/dashboard" style={{ color: 'var(--primary)' }}>
                  {t('home.noBusinessLink')}
                </a>
              </p>
            )}
          </motion.div>
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
