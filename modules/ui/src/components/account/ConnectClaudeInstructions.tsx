import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { env } from '../../app/container';
import styles from './ConnectClaude.module.css';

// WARNING: docs URL assumed (guides/mcp.md in the BE repo) — verify before merging
const DOCS_URL = 'https://github.com/bojanb89pa/reservation-be/blob/main/docs/guides/mcp.md';

export function ConnectClaudeInstructions() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url = env.mcpConnectorUrl;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the URL stays selectable in the read-only input.
    }
  };

  return (
    <section className={styles.section}>
      <p className={styles.intro}>{t('connectClaude.intro')}</p>
      <label className={styles.label} htmlFor="mcp-connector-url">
        {t('connectClaude.urlLabel')}
      </label>
      <div className={styles.urlRow}>
        <input
          id="mcp-connector-url"
          className={styles.urlInput}
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
          {copied ? t('connectClaude.copied') : t('connectClaude.copy')}
        </button>
      </div>
      <h2 className={styles.heading}>{t('connectClaude.stepsTitle')}</h2>
      <ol className={styles.steps}>
        <li>{t('connectClaude.step1')}</li>
        <li>{t('connectClaude.step2')}</li>
        <li>{t('connectClaude.step3')}</li>
      </ol>
      <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
        {t('connectClaude.docs')}
      </a>
    </section>
  );
}
