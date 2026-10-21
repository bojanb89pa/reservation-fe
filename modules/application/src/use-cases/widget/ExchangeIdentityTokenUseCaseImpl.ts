import type {
  ExchangeIdentityTokenCommand,
  ExchangeIdentityTokenUseCase,
  TokenExchangeRepository,
  TokenExchangeResult,
} from '@fe/domain';

export class ExchangeIdentityTokenUseCaseImpl implements ExchangeIdentityTokenUseCase {
  constructor(private readonly tokenExchangeRepository: TokenExchangeRepository) {}

  execute(command: ExchangeIdentityTokenCommand): Promise<TokenExchangeResult> {
    return this.tokenExchangeRepository.exchangeIdentityToken(command);
  }
}
