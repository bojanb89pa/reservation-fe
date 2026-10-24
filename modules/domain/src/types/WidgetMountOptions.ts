import type {
  WidgetLocale,
  WidgetTheme,
  WidgetUnavailableReason,
} from '../entities/ClientApplicationWidget';
import type { ReservationCreatedPayload } from '../entities/WidgetMessage';
import type { IdentityTokenType } from '../entities/TokenExchange';

/**
 * Options of the public loader call
 * `window.ReservaWidget.push(['mount', selector, options])`.
 */
// WARNING: shape taken from the ticket summary of the plan (docs/plan-faza-2-widget-partneri.md), plan not available locally — verify before merging
export interface WidgetMountOptions {
  /** Public client application ID. */
  clientId: string;
  locationId: string;
  theme?: WidgetTheme;
  locale?: WidgetLocale;
  /**
   * Partner user's identity token (OIDC ID token, or an assertion signed by the partner's
   * backend), or `null` for a guest. Called on `need-identity` and `refreshIdentity()`.
   */
  getIdentityToken: () => string | null | Promise<string | null>;
  // WARNING: option name not in the BE brief; needed so a put 2 assertion is exchanged with subject_token_type jwt — verify before merging
  /**
   * What `getIdentityToken` returns: `id_token` (default, put 1) or `jwt` (assertion of a
   * `PARTNER_KEY` issuer, put 2).
   */
  identityTokenType?: IdentityTokenType;
  onReservationCreated?: (reservation: ReservationCreatedPayload) => void;
  /**
   * Called when a guest clicks "Reserve" (the widget got `null` from `getIdentityToken`).
   * The partner opens its sign-in and, once signed in, calls `refreshIdentity()`; the widget
   * then finishes the remembered reservation. Without it the widget asks the guest to sign in
   * on the partner's site.
   */
  onSignInRequired?: () => void;
  onUnavailable?: (event: { reason: WidgetUnavailableReason }) => void;
}
