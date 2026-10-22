import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CLIENT_APPLICATION_OAUTH_SCOPES,
  PARTNER_KEY_SOURCES,
  TRUSTED_ISSUER_TYPES,
  validatePartnerKeyIssuer,
} from '@fe/domain';
import type {
  ClientApplicationIntegration,
  PartnerKeyIssuerProblem,
  PartnerKeySource,
  TrustedIssuer,
  UpdateClientApplicationIntegrationCommand,
} from '@fe/domain';
import { useOAuthScopeLabel } from '../../hooks/useOAuthScopeLabel';
import styles from './ClientApplicationIntegrationForm.module.css';

interface IssuerDraft {
  type: TrustedIssuer['type'];
  issuer: string;
  jwksUri: string;
  inlineJwk: string;
  keySource: PartnerKeySource;
  audiences: string;
}

interface Props {
  integration: ClientApplicationIntegration;
  onSubmit: (command: UpdateClientApplicationIntegrationCommand) => Promise<void>;
  isPending: boolean;
}

const KEY_SOURCE_LABELS: Record<PartnerKeySource, string> = {
  JWKS_URI: 'clientApplicationIntegration.keySourceJwksUri',
  INLINE_JWK: 'clientApplicationIntegration.keySourceInlineJwk',
};

function splitList(value: string, separator: RegExp): string[] {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

function orNull(value: string): string | null {
  return value.trim() === '' ? null : value.trim();
}

function toDraft(issuer: TrustedIssuer): IssuerDraft {
  const inlineJwk = issuer.inlineJwk ?? '';
  return {
    type: issuer.type,
    issuer: issuer.issuer,
    jwksUri: issuer.jwksUri ?? '',
    inlineJwk,
    keySource: inlineJwk.trim() !== '' ? 'INLINE_JWK' : 'JWKS_URI',
    audiences: issuer.audiences.join(', '),
  };
}

/** Only the field of the chosen key source is sent; the other one is `null`. */
function keyFields(draft: IssuerDraft) {
  return {
    jwksUri: draft.keySource === 'JWKS_URI' ? orNull(draft.jwksUri) : null,
    inlineJwk: draft.keySource === 'INLINE_JWK' ? orNull(draft.inlineJwk) : null,
  };
}

function toIssuer(draft: IssuerDraft): TrustedIssuer {
  if (draft.type === 'PARTNER_KEY') {
    return { type: draft.type, issuer: draft.issuer.trim(), ...keyFields(draft), audiences: [] };
  }
  return {
    type: draft.type,
    issuer: draft.issuer.trim(),
    jwksUri: orNull(draft.jwksUri),
    inlineJwk: null,
    audiences: splitList(draft.audiences, /[,\n]/),
  };
}

function problemFor(draft: IssuerDraft): PartnerKeyIssuerProblem | null {
  if (draft.type !== 'PARTNER_KEY') return null;
  return validatePartnerKeyIssuer({ issuer: draft.issuer.trim(), ...keyFields(draft) });
}

export function ClientApplicationIntegrationForm({ integration, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const scopeLabel = useOAuthScopeLabel();

  const [issuers, setIssuers] = useState<IssuerDraft[]>(integration.trustedIssuers.map(toDraft));
  const [origins, setOrigins] = useState(integration.allowedOrigins.join('\n'));
  const [scopes, setScopes] = useState<string[]>(integration.allowedScopes);
  const [submitted, setSubmitted] = useState(false);

  const updateIssuer = (index: number, patch: Partial<IssuerDraft>) => {
    setIssuers((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addIssuer = () => {
    setIssuers((prev) => [
      ...prev,
      {
        type: 'OIDC',
        issuer: '',
        jwksUri: '',
        inlineJwk: '',
        keySource: 'JWKS_URI',
        audiences: '',
      },
    ]);
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
    setSubmitted(true);
    // The BE has the final word (400); this only saves a round trip for obvious mistakes.
    if (issuers.some((draft) => problemFor(draft) !== null)) return;
    await onSubmit({
      clientApplicationId: integration.clientApplicationId,
      trustedIssuers: issuers.map(toIssuer),
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
          const isPartnerKey = draft.type === 'PARTNER_KEY';
          const problem = submitted ? problemFor(draft) : null;
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
              {isPartnerKey && (
                <fieldset className={styles.keySource}>
                  <legend className="form-label">
                    {t('clientApplicationIntegration.keySource', { n })}
                  </legend>
                  {PARTNER_KEY_SOURCES.map((source) => (
                    <label key={source} className={styles.checkboxOption}>
                      <input
                        type="radio"
                        name={`integration-issuer-key-source-${index}`}
                        value={source}
                        checked={draft.keySource === source}
                        onChange={() => updateIssuer(index, { keySource: source })}
                      />
                      {t(KEY_SOURCE_LABELS[source])}
                    </label>
                  ))}
                </fieldset>
              )}
              {isPartnerKey && draft.keySource === 'INLINE_JWK' ? (
                <div className="form-field">
                  <label className="form-label" htmlFor={`integration-issuer-inline-jwk-${index}`}>
                    {t('clientApplicationIntegration.issuerInlineJwk', { n })}
                  </label>
                  <textarea
                    id={`integration-issuer-inline-jwk-${index}`}
                    className="form-input"
                    rows={6}
                    spellCheck={false}
                    placeholder={t('clientApplicationIntegration.inlineJwkPlaceholder')}
                    value={draft.inlineJwk}
                    onChange={(e) => updateIssuer(index, { inlineJwk: e.target.value })}
                  />
                </div>
              ) : (
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
              )}
              {!isPartnerKey && (
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
              )}
              {problem && (
                <div className="error-box" role="alert">
                  {t(`clientApplicationIntegration.partnerKeyProblem.${problem}`)}
                </div>
              )}
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
