/** A location the widget may book: in the partner's scope and APPROVED by the location owner. */
export interface ClientApplicationWidgetLocation {
  locationId: string;
  locationName: string | null;
  businessId: string;
  businessName: string;
}

/** Public `GET /client-applications/{id}/widget-config` response (resource-service). */
export interface ClientApplicationWidgetConfig {
  clientApplicationId: string;
  enabled: boolean;
  /** Only scope ∩ APPROVED consents. */
  locations: ClientApplicationWidgetLocation[];
}

/**
 * Everything the widget needs before rendering. resource-service's widget-config has no
 * `allowedOrigins`; they come from the public integration in auth-service
 * (`PublicClientApplicationIntegration`), so this is assembled from both.
 */
export interface WidgetConfig {
  clientApplicationId: string;
  /** `scheme://host[:port]` origins allowed to embed the widget and talk to it. Empty when the partner has no integration. */
  allowedOrigins: string[];
  enabled: boolean;
  locations: ClientApplicationWidgetLocation[];
}

/**
 * Why the widget cannot book at the requested location; passed to the partner's
 * `onUnavailable({ reason })`.
 */
export type WidgetUnavailableReason =
  /** The location is not in the partner's scope (or not in widget-config `locations`). */
  | 'LOCATION_OUT_OF_SCOPE'
  /** The location owner has not approved the partner, or revoked the consent. */
  | 'CONSENT_NOT_APPROVED'
  /** The partner is disabled by an admin (`enabled = false`). */
  | 'PARTNER_DISABLED';

export const WIDGET_UNAVAILABLE_REASONS: readonly WidgetUnavailableReason[] = [
  'LOCATION_OUT_OF_SCOPE',
  'CONSENT_NOT_APPROVED',
  'PARTNER_DISABLED',
];

export type WidgetAvailability =
  | { available: true; location: ClientApplicationWidgetLocation }
  | { available: false; reason: WidgetUnavailableReason };

/** Theme passed by the partner; `auto` follows `prefers-color-scheme`. Maps onto the existing `data-theme` tokens. */
export type WidgetTheme = 'light' | 'dark' | 'auto';
export type WidgetLocale = 'sr' | 'en';

export const DEFAULT_WIDGET_THEME: WidgetTheme = 'auto';
export const DEFAULT_WIDGET_LOCALE: WidgetLocale = 'sr';

export function toWidgetTheme(value: string | null | undefined): WidgetTheme {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : DEFAULT_WIDGET_THEME;
}

export function toWidgetLocale(value: string | null | undefined): WidgetLocale {
  return value === 'sr' || value === 'en' ? value : DEFAULT_WIDGET_LOCALE;
}
