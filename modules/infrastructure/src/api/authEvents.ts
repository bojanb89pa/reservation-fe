import type { AuthSession } from '@domain';

/** Dispatched on `window` after a transparent background refresh succeeds. */
export const AUTH_SESSION_REFRESHED_EVENT = 'auth:session-refreshed';

/** Dispatched on `window` once refresh has been attempted and failed (or no refresh token was available). */
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

export function emitSessionRefreshed(session: AuthSession): void {
  window.dispatchEvent(new CustomEvent<AuthSession>(AUTH_SESSION_REFRESHED_EVENT, { detail: session }));
}

export function emitSessionExpired(): void {
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}
