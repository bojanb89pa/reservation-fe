import type { ExchangeIdentityTokenCommand, TokenExchangeResult } from '../entities/TokenExchange';

export interface TokenExchangeRepository {
  /** Rejects with `TokenExchangeError` when auth-service refuses the ID token or the client. */
  exchangeIdentityToken(command: ExchangeIdentityTokenCommand): Promise<TokenExchangeResult>;
}
