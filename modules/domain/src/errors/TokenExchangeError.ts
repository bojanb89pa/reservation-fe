import { DomainError } from './DomainError';

/** OAuth2 `error` values returned by `POST /oauth2/token` for a token exchange. */
export enum TokenExchangeErrorCode {
  /** 400: `subject_token` missing or `subject_token_type` is neither an ID token nor a JWT. */
  INVALID_REQUEST = 'invalid_request',
  /**
   * 400: bad signature, expired token, wrong `aud`, unknown or foreign `iss`, no email; for a
   * partner assertion also `exp` more than 5 minutes ahead, missing or replayed `jti`.
   */
  INVALID_GRANT = 'invalid_grant',
  /** 400: none of the requested scopes is allowed to the partner. */
  INVALID_SCOPE = 'invalid_scope',
  /** 401: `client_id` is not a partner, the partner is disabled or has no integration. */
  INVALID_CLIENT = 'invalid_client',
}

/**
 * The ID token was rejected. `errorDescription` is the BE message key when present,
 * e.g. `error.external_id_token.audience_mismatch`.
 */
export class TokenExchangeError extends DomainError {
  constructor(
    code: TokenExchangeErrorCode | string,
    public readonly errorDescription?: string,
  ) {
    super(errorDescription ?? code, code);
    this.name = 'TokenExchangeError';
  }
}
