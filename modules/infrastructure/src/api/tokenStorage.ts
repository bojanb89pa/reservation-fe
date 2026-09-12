const ACCESS_TOKEN_KEY = 'reserva_access_token';
const REFRESH_TOKEN_KEY = 'reserva_refresh_token';
const ID_TOKEN_KEY = 'reserva_id_token';
/** sessionStorage flag: set right before the forced re-login redirect, read once by the UI after the OAuth round-trip. */
const SESSION_EXPIRED_FLAG_KEY = 'reserva_session_expired';

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  getIdToken(): string | null {
    return localStorage.getItem(ID_TOKEN_KEY);
  },
  setIdToken(token: string): void {
    localStorage.setItem(ID_TOKEN_KEY, token);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ID_TOKEN_KEY);
  },
  markSessionExpired(): void {
    sessionStorage.setItem(SESSION_EXPIRED_FLAG_KEY, 'true');
  },
  /** Reads and clears the flag in one step so the "session expired" message is shown at most once. */
  consumeSessionExpiredFlag(): boolean {
    const wasSet = sessionStorage.getItem(SESSION_EXPIRED_FLAG_KEY) === 'true';
    sessionStorage.removeItem(SESSION_EXPIRED_FLAG_KEY);
    return wasSet;
  },
};
