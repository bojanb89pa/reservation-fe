import type {
  WidgetLocale,
  WidgetTheme,
  WidgetUnavailableReason,
} from '../entities/ClientApplicationWidget';
import type { ReservationCreatedPayload } from '../entities/WidgetMessage';

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
  /** Partner user's OIDC ID token, or `null` for a guest. Called on `need-identity` and `refreshIdentity()`. */
  getIdentityToken: () => string | null | Promise<string | null>;
  onReservationCreated?: (reservation: ReservationCreatedPayload) => void;
  onUnavailable?: (event: { reason: WidgetUnavailableReason }) => void;
}
