import type { AxiosInstance } from 'axios';
import type { AuthRepository, AuthSession, User, UserRegistration } from '@domain';
import { env } from '../config/environment';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

export class AuthApiRepository implements AuthRepository {
  constructor(private readonly client: AxiosInstance) {}

  async login(email: string, password: string): Promise<AuthSession> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.oauthClientId,
      redirect_uri: env.oauthRedirectUri,
    });

    // The auth server uses OAuth2 authorization code flow.
    // This method is called after the code exchange in OAuthCallbackPage.
    // We expose a separate method for the code exchange.
    // For direct login, redirect to the auth server.
    void email;
    void password;
    void params;
    throw new Error('Use initiateLogin() to redirect to auth server');
  }

  async exchangeCode(code: string): Promise<AuthSession> {
    const basic = btoa(`${env.oauthClientId}:${env.oauthClientSecret}`);
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.oauthRedirectUri,
      client_id: env.oauthClientId,
    });

    const response = await this.client.post<TokenResponse>('/oauth2/token', body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
    });

    return this.mapTokenResponse(response.data);
  }

  async refreshToken(refreshToken: string): Promise<AuthSession> {
    const basic = btoa(`${env.oauthClientId}:${env.oauthClientSecret}`);
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await this.client.post<TokenResponse>('/oauth2/token', body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
    });

    return this.mapTokenResponse(response.data);
  }

  async register(registration: UserRegistration): Promise<User> {
    const response = await this.client.post<User>('/api/users/register', registration);
    return response.data;
  }

  async logout(): Promise<void> {
    // JWT-based auth — just clear local tokens
  }

  private mapTokenResponse(data: TokenResponse): AuthSession {
    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope,
      refreshToken: data.refresh_token,
    };
  }
}
