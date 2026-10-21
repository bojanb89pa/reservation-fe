import type {
  ExchangeIdentityTokenCommand,
  TokenExchangeResult,
} from '../../entities/TokenExchange';

export interface ExchangeIdentityTokenUseCase {
  execute(command: ExchangeIdentityTokenCommand): Promise<TokenExchangeResult>;
}
