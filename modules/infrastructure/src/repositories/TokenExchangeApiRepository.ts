import type { AxiosInstance } from 'axios';
import type {
  ExchangeIdentityTokenCommand,
  TokenExchangeRepository,
  TokenExchangeResult,
} from '@fe/domain';

interface TokenExchangeResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope?: string;
  issued_token_type: 'urn:ietf:params:oauth:token-type:access_token';
}

export class TokenExchangeApiRepository implements TokenExchangeRepository {
  /** @param client unauthenticated auth-service client (`authAxiosClient`) */
  constructor(private readonly client: AxiosInstance) {}

  async exchangeIdentityToken(command: ExchangeIdentityTokenCommand): Promise<TokenExchangeResult> {
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      client_id: command.clientApplicationId,
      subject_token: command.idToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
    });
    if (command.scopes && command.scopes.length > 0) {
      params.set('scope', command.scopes.join(' '));
    }
    const response = await this.client.post<TokenExchangeResponse>('/oauth2/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = response.data;
    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope,
      issuedTokenType: data.issued_token_type,
    };
  }
}
