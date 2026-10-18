/** `PARTNER_KEY` is stored by the BE but not yet used by token exchange. */
export type TrustedIssuerType = 'OIDC' | 'PARTNER_KEY';

export const TRUSTED_ISSUER_TYPES: readonly TrustedIssuerType[] = ['OIDC', 'PARTNER_KEY'];

/** OAuth scopes a partner may be granted in its integration configuration. */
export type ClientApplicationOAuthScope = 'reservation:create' | 'reservation:read:own';

export const CLIENT_APPLICATION_OAUTH_SCOPES: readonly ClientApplicationOAuthScope[] = [
  'reservation:create',
  'reservation:read:own',
];

export interface TrustedIssuer {
  type: TrustedIssuerType;
  issuer: string;
  jwksUri: string | null;
  /** OIDC issuers need at least one audience. */
  audiences: string[];
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
