import { useTranslation } from 'react-i18next';
import { env } from '../app/container';
import styles from './LegalPage.module.css';

export type LegalKind = 'privacy' | 'terms';

interface LegalSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

// Datum poslednje izmene teksta; menja se zajedno sa sadržajem u `legal.*` prevodima.
const LAST_UPDATED = new Date('2026-10-21T00:00:00Z');

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { t, i18n } = useTranslation();
  const sections = t(`legal.${kind}.sections`, { returnObjects: true }) as LegalSection[];
  const updated = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(LAST_UPDATED);

  return (
    <div className={styles.page}>
      <article className={styles.card}>
        <div className="eyebrow-rule">{t('legal.eyebrow')}</div>
        <h1 className={styles.title}>{t(`legal.${kind}.title`)}</h1>
        <p className={styles.updated}>
          {t('legal.lastUpdated')}: <time dateTime="2026-10-21">{updated}</time>
        </p>
        <p className={styles.notice}>{t('legal.notice')}</p>
        {sections.map((section) => (
          <section key={section.title} className={styles.section}>
            <h2 className={styles.heading}>{section.title}</h2>
            {section.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {section.items && (
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <section className={styles.section}>
          <h2 className={styles.heading}>{t('legal.contactTitle')}</h2>
          <p>
            {t('legal.contactText')}{' '}
            <a href={`mailto:${env.legalContactEmail}`}>{env.legalContactEmail}</a>
          </p>
        </section>
      </article>
    </div>
  );
}
