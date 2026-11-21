import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { McpClientConsent } from '@fe/domain';
import { useMyMcpClientConsents, useRevokeMcpClientConsent } from '../../hooks/useMcpClientConsents';
import { useOAuthScopeLabel } from '../../hooks/useOAuthScopeLabel';
import { ErrorState } from '../ErrorState';
import styles from './ConnectClaude.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ConnectedAiApps() {
  const { t } = useTranslation();
  const scopeLabel = useOAuthScopeLabel();
  const { data, isLoading, isError, refetch, isRefetching } = useMyMcpClientConsents();
  const revoke = useRevokeMcpClientConsent();
  const [pending, setPending] = useState<McpClientConsent | null>(null);

  const close = () => {
    setPending(null);
    revoke.reset();
  };

  const confirm = () => {
    if (!pending) return;
    revoke.mutate(pending.clientId, {
      onSuccess: close,
      // Already revoked elsewhere: the hook refreshes the list, just close the dialog.
      onError: (error) => {
        if (error instanceof Error && error.name === 'NotFoundError') close();
      },
    });
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{t('connectClaude.connectedTitle')}</h2>

      {isLoading && (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      )}
      {isError && (
        <ErrorState
          message={t('connectClaude.loadError')}
          onRetry={refetch}
          isRetrying={isRefetching}
        />
      )}
      {data && data.length === 0 && <p>{t('connectClaude.empty')}</p>}
      {data && data.length > 0 && (
        <ul className={styles.list}>
          {data.map((consent) => (
            <li key={consent.clientId} className={styles.item} data-testid="connected-ai-app-item">
              <div>
                {/* clientName is external text: rendered as plain text (React escapes it). */}
                <strong>{consent.clientName}</strong>
                <div>
                  {t('connectClaude.host')}: {consent.clientHost}
                </div>
                <div>
                  {t('connectClaude.scopes')}:{' '}
                  {consent.scopes.length > 0
                    ? consent.scopes.map(scopeLabel).join(', ')
                    : t('connectClaude.noScopes')}
                </div>
                <div>
                  {t('connectClaude.grantedAt')}:{' '}
                  {consent.grantedAt ? formatDate(consent.grantedAt) : t('connectClaude.unknownDate')}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                aria-label={t('connectClaude.revokeAria', {
                  name: consent.clientName,
                  interpolation: { escapeValue: false },
                })}
                onClick={() => setPending(consent)}
              >
                {t('connectClaude.revoke')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <div className={styles.overlay}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-mcp-title"
          >
            <h3 id="revoke-mcp-title" className={styles.dialogTitle}>
              {t('connectClaude.confirmTitle')}
            </h3>
            <p>
              {t('connectClaude.confirmBody', {
                name: pending.clientName,
                interpolation: { escapeValue: false },
              })}
            </p>
            {revoke.isError && (
              <div className="error-box" role="alert">
                {t('connectClaude.revokeError')}
              </div>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={close}
                disabled={revoke.isPending}
              >
                {t('connectClaude.confirmCancel')}
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={confirm}
                disabled={revoke.isPending}
              >
                {revoke.isPending ? t('connectClaude.revoking') : t('connectClaude.confirmRevoke')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
