/**
 * Exchange of a partner user's OIDC ID token for a Reserva partner access token
 * (`POST /oauth2/token`, grant `urn:ietf:params:oauth:grant-type:token-exchange`,
 * public client: `client_id` only, no secret, no PKCE).
 */
export interface ExchangeIdentityTokenCommand {
  /** Public ID of the client application (UUID), sent as `client_id`. */
  clientApplicationId: string;
  /** OIDC ID token issued by the partner's identity provider, sent as `subject_token`. */
  idToken: string;
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
