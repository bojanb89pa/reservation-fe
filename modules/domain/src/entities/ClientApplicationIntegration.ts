/**
 * `OIDC`: the partner's identity provider signs an ID token (put 1).
 * `PARTNER_KEY`: the partner's backend signs a short identity assertion JWT (put 2).
 */
export type TrustedIssuerType = 'OIDC' | 'PARTNER_KEY';

export const TRUSTED_ISSUER_TYPES: readonly TrustedIssuerType[] = ['OIDC', 'PARTNER_KEY'];

/** OAuth scopes a partner may be granted in its integration configuration. */
export type ClientApplicationOAuthScope = 'reservation:create' | 'reservation:read:own';

export const CLIENT_APPLICATION_OAUTH_SCOPES: readonly ClientApplicationOAuthScope[] = [
  'reservation:create',
  'reservation:read:own',
];

/**
 * Mirrors BE `TrustedIssuerResponse` (read) and `TrustedIssuerRequest` (write).
 * `PARTNER_KEY` needs exactly one of `jwksUri` / `inlineJwk`; an empty string counts as not sent.
 */
export interface TrustedIssuer {
  type: TrustedIssuerType;
  /** `PARTNER_KEY`: the partner's identifier (URL or opaque ID), no whitespace; the assertion's `iss`. */
  issuer: string;
  /** Absolute URL of the issuer's JWKS. */
  jwksUri: string | null;
  /** OIDC issuers need at least one audience. Not used for `PARTNER_KEY` (send `[]`). */
  audiences: string[];
  // WARNING: BE response always carries `inlineJwk` (string | null); optional here so existing TrustedIssuer literals keep compiling (approved on ticket #366) — verify before merging
  /**
   * `PARTNER_KEY` only: one public JWK as a JSON string (`kty` `RSA`, or `EC` with `crv` `P-256`,
   * no private members). Must be `null` or absent for `OIDC`. Returned exactly as stored.
   */
  inlineJwk?: string | null;
}

/** Where a `PARTNER_KEY` issuer's public key comes from. */
export type PartnerKeySource = 'JWKS_URI' | 'INLINE_JWK';

export const PARTNER_KEY_SOURCES: readonly PartnerKeySource[] = ['JWKS_URI', 'INLINE_JWK'];

/** Audience the BE requires in every partner assertion (put 2). */
export const PARTNER_ASSERTION_AUDIENCE = 'reserva';

/** Private JWK members; a key carrying any of them is rejected. */
const PRIVATE_JWK_MEMBERS = ['d', 'p', 'q', 'dp', 'dq', 'qi'];

/** First reason a `PARTNER_KEY` issuer would be rejected by the BE. */
export type PartnerKeyIssuerProblem =
  /** `issuer` is empty or contains whitespace (BE 422 `issuer_invalid`). */
  | 'ISSUER_INVALID'
  /** Neither `jwksUri` nor `inlineJwk` (BE 400 `partner_key_invalid`). */
  | 'KEY_MISSING'
  /** Both `jwksUri` and `inlineJwk` (BE 400 `partner_key_invalid`). */
  | 'KEY_AMBIGUOUS'
  /** `jwksUri` is not an absolute URL (BE 400 `partner_key_invalid`). */
  | 'JWKS_URI_NOT_ABSOLUTE'
  /** `inlineJwk` is not a JSON object (BE 400 `partner_key_invalid`). */
  | 'INLINE_JWK_NOT_JSON_OBJECT'
  /** `inlineJwk` is neither `kty` `RSA` nor `kty` `EC` with `crv` `P-256` (BE 400 `partner_key_invalid`). */
  | 'INLINE_JWK_UNSUPPORTED_KEY'
  /** `inlineJwk` has a private member such as `d` (BE 400 `partner_key_invalid`). */
  | 'INLINE_JWK_PRIVATE';

/** `scheme://` followed by a non-empty authority, no whitespace. */
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\/[^\s/?#]+\S*$/i;

/** An empty or whitespace-only value counts as not sent. */
function presentOrNull(value: string | null | undefined): string | null {
  return value === null || value === undefined || value.trim() === '' ? null : value;
}

function inlineJwkProblem(inlineJwk: string): PartnerKeyIssuerProblem | null {
  let jwk: unknown;
  try {
    jwk = JSON.parse(inlineJwk);
  } catch {
    return 'INLINE_JWK_NOT_JSON_OBJECT';
  }
  if (typeof jwk !== 'object' || jwk === null || Array.isArray(jwk)) {
    return 'INLINE_JWK_NOT_JSON_OBJECT';
  }
  const key = jwk as Record<string, unknown>;
  if (PRIVATE_JWK_MEMBERS.some((member) => member in key)) return 'INLINE_JWK_PRIVATE';
  if (key.kty === 'RSA') return null;
  if (key.kty === 'EC' && key.crv === 'P-256') return null;
  return 'INLINE_JWK_UNSUPPORTED_KEY';
}

/**
 * Client-side check of a `PARTNER_KEY` issuer, mirroring the BE rules of
 * `PUT /admin/client-applications/{id}/integration`. Returns the first problem, or
 * `null` when the issuer looks valid. The BE has the final word (400 `partner_key_invalid`).
 */
export function validatePartnerKeyIssuer(
  issuer: Pick<TrustedIssuer, 'issuer' | 'jwksUri' | 'inlineJwk'>,
): PartnerKeyIssuerProblem | null {
  if (issuer.issuer.trim() === '' || /\s/.test(issuer.issuer)) return 'ISSUER_INVALID';
  const jwksUri = presentOrNull(issuer.jwksUri);
  const inlineJwk = presentOrNull(issuer.inlineJwk);
  if (jwksUri !== null && inlineJwk !== null) return 'KEY_AMBIGUOUS';
  if (jwksUri !== null) return ABSOLUTE_URL.test(jwksUri.trim()) ? null : 'JWKS_URI_NOT_ABSOLUTE';
  if (inlineJwk !== null) return inlineJwkProblem(inlineJwk);
  return 'KEY_MISSING';
}

/** Partner's integration configuration in auth-service (admin view). */
export interface ClientApplicationIntegration {
  clientApplicationId: string;
  trustedIssuers: TrustedIssuer[];
  /** `scheme://host[:port]`, no path and no trailing slash. */
  allowedOrigins: string[];
  /** Subset of {@link CLIENT_APPLICATION_OAUTH_SCOPES}. */
  allowedScopes: string[];
}

/** Replaces the whole integration configuration of a partner. */
export interface UpdateClientApplicationIntegrationCommand {
  clientApplicationId: string;
  trustedIssuers: TrustedIssuer[];
  allowedOrigins: string[];
  allowedScopes: string[];
}

/** Public part of the integration (no issuers): partner's domains and what it may do. */
export interface PublicClientApplicationIntegration {
  clientApplicationId: string;
  allowedOrigins: string[];
  allowedScopes: string[];
}
