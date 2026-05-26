export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
  refreshToken?: string;
  idToken?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}
