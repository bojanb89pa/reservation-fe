import { ClientApplicationConsentErrorCode } from '@fe/domain';
import type { WidgetAvailability, WidgetConfig, WidgetUnavailableReason } from '@fe/domain';

/**
 * Whether the widget can book at `locationId`. BE `locations` is already scope ∩ APPROVED consents,
 * so a missing location is reported as LOCATION_OUT_OF_SCOPE.
 */
// WARNING: config cannot tell "out of scope" from "no consent"; CONSENT_NOT_APPROVED comes only from a failed reservation — verify before merging
export function resolveWidgetAvailability(config: WidgetConfig, locationId: string): WidgetAvailability {
  if (!config.enabled) {
    return { available: false, reason: 'PARTNER_DISABLED' };
  }
  const location = config.locations.find((l) => l.locationId === locationId);
  if (!location) {
    return { available: false, reason: 'LOCATION_OUT_OF_SCOPE' };
  }
  return { available: true, location };
}

/** Maps a failed reservation creation to an unavailable reason; `null` when the error is unrelated. */
// WARNING: matches on `error.code` carrying the BE code of the 422 — verify before merging
export function mapReservationErrorToUnavailableReason(error: unknown): WidgetUnavailableReason | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    if ((error as { code?: unknown }).code === ClientApplicationConsentErrorCode.CONSENT_NOT_APPROVED) {
      return 'CONSENT_NOT_APPROVED';
    }
  }
  return null;
}
