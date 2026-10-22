/**
 * Kind of partner identity token, sent as `subject_token_type`:
 * `id_token` → `urn:ietf:params:oauth:token-type:id_token` (OIDC ID token, put 1),
 * `jwt` → `urn:ietf:params:oauth:token-type:jwt` (assertion signed by a `PARTNER_KEY` issuer, put 2).
 */
export type IdentityTokenType = 'id_token' | 'jwt';

export const IDENTITY_TOKEN_TYPES: readonly IdentityTokenType[] = ['id_token', 'jwt'];

export const DEFAULT_IDENTITY_TOKEN_TYPE: IdentityTokenType = 'id_token';

/**
 * Exchange of a partner user's identity token (OIDC ID token or partner assertion) for a
 * Reserva partner access token (`POST /oauth2/token`, grant
 * `urn:ietf:params:oauth:grant-type:token-exchange`, public client: `client_id` only,
 * no secret, no PKCE).
 */
export interface ExchangeIdentityTokenCommand {
  /** Public ID of the client application (UUID), sent as `client_id`. */
  clientApplicationId: string;
  /** Partner's identity token (OIDC ID token or partner assertion JWT), sent as `subject_token`. */
  idToken: string;
  // WARNING: brief says the FE does not call the jwt exchange; added so the widget can carry a put 2 assertion as docs/partner-integration.md describes — verify before merging
  /** Kind of `idToken`; omitted means {@link DEFAULT_IDENTITY_TOKEN_TYPE}. */
  subjectTokenType?: IdentityTokenType;
  /** Requested scopes; omitted means every scope the partner is allowed. */
  scopes?: string[];
}

/** Token exchange response. There is no refresh token; exchange again when it expires. */
export interface TokenExchangeResult {
  /** JWT for resource-service, valid ~10 minutes. Not usable on Reserva user endpoints. */
  accessToken: string;
  tokenType: 'Bearer';
  /** Seconds, ~600. */
  expiresIn: number;
  /** Space-separated intersection of requested and allowed scopes. */
  scope?: string;
  issuedTokenType: 'urn:ietf:params:oauth:token-type:access_token';
}
