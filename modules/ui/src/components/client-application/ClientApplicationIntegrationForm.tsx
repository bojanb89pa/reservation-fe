import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CLIENT_APPLICATION_OAUTH_SCOPES, TRUSTED_ISSUER_TYPES } from '@fe/domain';
import type {
  ClientApplicationIntegration,
  TrustedIssuer,
  UpdateClientApplicationIntegrationCommand,
} from '@fe/domain';
import { useOAuthScopeLabel } from '../../hooks/useOAuthScopeLabel';
import styles from './ClientApplicationIntegrationForm.module.css';

interface IssuerDraft {
  type: TrustedIssuer['type'];
  issuer: string;
  jwksUri: string;
  audiences: string;
}

interface Props {
  integration: ClientApplicationIntegration;
  onSubmit: (command: UpdateClientApplicationIntegrationCommand) => Promise<void>;
  isPending: boolean;
}

function splitList(value: string, separator: RegExp): string[] {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

function toDraft(issuer: TrustedIssuer): IssuerDraft {
  return {
    type: issuer.type,
    issuer: issuer.issuer,
    jwksUri: issuer.jwksUri ?? '',
    audiences: issuer.audiences.join(', '),
  };
}

export function ClientApplicationIntegrationForm({ integration, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const scopeLabel = useOAuthScopeLabel();

  const [issuers, setIssuers] = useState<IssuerDraft[]>(integration.trustedIssuers.map(toDraft));
  const [origins, setOrigins] = useState(integration.allowedOrigins.join('\n'));
  const [scopes, setScopes] = useState<string[]>(integration.allowedScopes);

  const updateIssuer = (index: number, patch: Partial<IssuerDraft>) => {
    setIssuers((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addIssuer = () => {
    setIssuers((prev) => [...prev, { type: 'OIDC', issuer: '', jwksUri: '', audiences: '' }]);
  };

  const removeIssuer = (index: number) => {
    setIssuers((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      clientApplicationId: integration.clientApplicationId,
      trustedIssuers: issuers.map((draft) => ({
        type: draft.type,
        issuer: draft.issuer.trim(),
        jwksUri: draft.jwksUri.trim() === '' ? null : draft.jwksUri.trim(),
        audiences: splitList(draft.audiences, /[,\n]/),
      })),
      allowedOrigins: splitList(origins, /\n/),
      allowedScopes: scopes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t('clientApplicationIntegration.issuersLabel')}</legend>
        {issuers.length === 0 && (
          <div className={styles.empty}>{t('clientApplicationIntegration.noIssuers')}</div>
        )}
        {issuers.map((draft, index) => {
          const n = index + 1;
          return (
            <div key={index} className={styles.issuer} data-testid="integration-issuer">
              <div className="form-field">
                <label className="form-label" htmlFor={`integration-issuer-type-${index}`}>
                  {t('clientApplicationIntegration.issuerType', { n })}
                </label>
                <select
                  id={`integration-issuer-type-${index}`}
                  className="form-input"
                  value={draft.type}
                  onChange={(e) =>
                    updateIssuer(index, { type: e.target.value as TrustedIssuer['type'] })
                  }
                >
                  {TRUSTED_ISSUER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor={`integration-issuer-url-${index}`}>
                  {t('clientApplicationIntegration.issuerUrl', { n })}
                </label>
                <input
                  id={`integration-issuer-url-${index}`}
                  className="form-input"
                  value={draft.issuer}
                  onChange={(e) => updateIssuer(index, { issuer: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor={`integration-issuer-jwks-${index}`}>
                  {t('clientApplicationIntegration.issuerJwksUri', { n })}
                </label>
                <input
                  id={`integration-issuer-jwks-${index}`}
                  className="form-input"
                  value={draft.jwksUri}
                  onChange={(e) => updateIssuer(index, { jwksUri: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor={`integration-issuer-audiences-${index}`}>
                  {t('clientApplicationIntegration.issuerAudiences', { n })}
                </label>
                <input
                  id={`integration-issuer-audiences-${index}`}
                  className="form-input"
                  placeholder={t('clientApplicationIntegration.audiencesPlaceholder')}
                  value={draft.audiences}
                  onChange={(e) => updateIssuer(index, { audiences: e.target.value })}
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => removeIssuer(index)}
              >
                {t('clientApplicationIntegration.removeIssuer', { n })}
              </button>
            </div>
          );
        })}
        <button type="button" className="btn btn-secondary" onClick={addIssuer}>
          {t('clientApplicationIntegration.addIssuer')}
        </button>
      </fieldset>

      <div className="form-field">
        <label className="form-label" htmlFor="integration-origins">
          {t('clientApplicationIntegration.originsLabel')}
        </label>
        <textarea
          id="integration-origins"
          className="form-input"
          rows={4}
          placeholder={t('clientApplicationIntegration.originsPlaceholder')}
          value={origins}
          onChange={(e) => setOrigins(e.target.value)}
        />
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t('clientApplicationIntegration.scopesLabel')}</legend>
        {CLIENT_APPLICATION_OAUTH_SCOPES.map((scope) => (
          <label key={scope} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={scopes.includes(scope)}
              onChange={() => toggleScope(scope)}
            />
            {scopeLabel(scope)}
          </label>
        ))}
      </fieldset>

      <div className={styles.actions}>
        <button type="submit" className="btn btn-secondary" disabled={isPending}>
          {isPending
            ? t('clientApplicationIntegration.saving')
            : t('clientApplicationIntegration.save')}
        </button>
      </div>
    </form>
  );
}
