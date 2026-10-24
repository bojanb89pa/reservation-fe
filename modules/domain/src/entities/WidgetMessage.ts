import type { ClientApplicationReservation } from './ClientApplicationReservation';
import type { ReservationStatus } from './Reservation';
import type { WidgetTheme, WidgetUnavailableReason } from './ClientApplicationWidget';
import { WIDGET_UNAVAILABLE_REASONS, isWidgetTheme } from './ClientApplicationWidget';
import type { IdentityTokenType } from './TokenExchange';
import { IDENTITY_TOKEN_TYPES } from './TokenExchange';

/**
 * Versioned postMessage protocol between the loader (`widget.js`, on the partner page)
 * and the widget iframe (`/widget/`). Every message carries `v` and `type`; a receiver
 * ignores messages with an unknown `v` or `type`. Origin checks are not part of this
 * shape — each side checks `event.origin` before parsing.
 */
export const WIDGET_PROTOCOL_VERSION = 1;
export type WidgetProtocolVersion = typeof WIDGET_PROTOCOL_VERSION;

export const WidgetMessageType = {
  /** iframe → loader: the widget app has started and listens for messages. */
  READY: 'reserva:ready',
  /** iframe → loader: the widget needs the user's ID token (loader calls `getIdentityToken`). */
  NEED_IDENTITY: 'reserva:need-identity',
  /** loader → iframe: answer to `need-identity`, or pushed by `refreshIdentity()`. */
  IDENTITY: 'reserva:identity',
  /** iframe → loader: content height changed; the loader sets the iframe height. */
  RESIZE: 'reserva:resize',
  /** iframe → loader: a reservation was created; the loader calls `onReservationCreated`. */
  RESERVATION_CREATED: 'reserva:reservation-created',
  // WARNING: not in the ticket's message list, but the ticket requires the iframe to tell the loader to call onUnavailable — verify before merging
  /** iframe → loader: the widget cannot book here; the loader calls `onUnavailable({ reason })`. */
  UNAVAILABLE: 'reserva:unavailable',
  /** iframe → loader: a guest tried to book; the loader calls the optional `onSignInRequired()`. */
  SIGN_IN_REQUIRED: 'reserva:sign-in-required',
  /** loader → iframe: the partner called `setTheme`; the widget switches `data-theme` without reloading. */
  THEME: 'reserva:theme',
} as const;

export type WidgetMessageTypeValue = (typeof WidgetMessageType)[keyof typeof WidgetMessageType];

interface WidgetMessageBase<T extends WidgetMessageTypeValue> {
  v: WidgetProtocolVersion;
  type: T;
}

export type WidgetReadyMessage = WidgetMessageBase<typeof WidgetMessageType.READY>;

export type WidgetNeedIdentityMessage = WidgetMessageBase<typeof WidgetMessageType.NEED_IDENTITY>;

export interface WidgetIdentityMessage extends WidgetMessageBase<
  typeof WidgetMessageType.IDENTITY
> {
  /** Partner's identity token; `null` for a guest (not logged in at the partner). */
  idToken: string | null;
  /** Kind of `idToken` (the loader's `identityTokenType`); absent means `id_token`. */
  tokenType?: IdentityTokenType;
}

export interface WidgetResizeMessage extends WidgetMessageBase<typeof WidgetMessageType.RESIZE> {
  /** Content height in CSS pixels. */
  height: number;
}

/**
 * The only reservation data that leaves the iframe. No email, no user or identity IDs,
 * no other personal data.
 */
export interface ReservationCreatedPayload {
  id: string;
  status: ReservationStatus;
  /** LocalDateTime */
  startTime: string;
  /** LocalDateTime */
  endTime: string;
  locationName: string | null;
}

export interface WidgetReservationCreatedMessage extends WidgetMessageBase<
  typeof WidgetMessageType.RESERVATION_CREATED
> {
  reservation: ReservationCreatedPayload;
}

export interface WidgetUnavailableMessage extends WidgetMessageBase<
  typeof WidgetMessageType.UNAVAILABLE
> {
  reason: WidgetUnavailableReason;
}

export type WidgetSignInRequiredMessage = WidgetMessageBase<
  typeof WidgetMessageType.SIGN_IN_REQUIRED
>;

export interface WidgetThemeMessage extends WidgetMessageBase<typeof WidgetMessageType.THEME> {
  theme: WidgetTheme;
}

/** Messages the iframe sends to the loader. */
export type WidgetToHostMessage =
  | WidgetReadyMessage
  | WidgetNeedIdentityMessage
  | WidgetSignInRequiredMessage
  | WidgetResizeMessage
  | WidgetReservationCreatedMessage
  | WidgetUnavailableMessage;

/** Messages the loader sends to the iframe. */
export type HostToWidgetMessage = WidgetIdentityMessage | WidgetThemeMessage;

export type WidgetMessage = WidgetToHostMessage | HostToWidgetMessage;

/** Builds the `reservation-created` payload, keeping only the allowed fields. */
export function toReservationCreatedPayload(
  reservation: Pick<ClientApplicationReservation, 'id' | 'status' | 'startTime' | 'endTime'>,
  locationName: string | null,
): ReservationCreatedPayload {
  return {
    id: reservation.id,
    status: reservation.status,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    locationName,
  };
}

const RESERVATION_STATUSES: readonly string[] = [
  'PENDING_APPROVAL',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isReservationCreatedPayload(value: unknown): value is ReservationCreatedPayload {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.status === 'string' &&
    RESERVATION_STATUSES.includes(value.status) &&
    typeof value.startTime === 'string' &&
    typeof value.endTime === 'string' &&
    (value.locationName === null || typeof value.locationName === 'string')
  );
}

/**
 * Validates untrusted `event.data`. Returns a well-formed protocol message, or `null`
 * for anything else (wrong version, unknown type, missing or mistyped fields). Extra
 * fields are dropped, so a `reservation-created` payload never carries more than
 * {@link ReservationCreatedPayload}.
 */
export function parseWidgetMessage(data: unknown): WidgetMessage | null {
  if (!isRecord(data) || data.v !== WIDGET_PROTOCOL_VERSION) return null;
  const v = WIDGET_PROTOCOL_VERSION;
  switch (data.type) {
    case WidgetMessageType.READY:
    case WidgetMessageType.NEED_IDENTITY:
    case WidgetMessageType.SIGN_IN_REQUIRED:
      return { v, type: data.type };
    case WidgetMessageType.IDENTITY:
      if (data.idToken !== null && typeof data.idToken !== 'string') return null;
      if (data.tokenType === undefined) return { v, type: data.type, idToken: data.idToken };
      return typeof data.tokenType === 'string' &&
        (IDENTITY_TOKEN_TYPES as readonly string[]).includes(data.tokenType)
        ? {
            v,
            type: data.type,
            idToken: data.idToken,
            tokenType: data.tokenType as IdentityTokenType,
          }
        : null;
    case WidgetMessageType.THEME:
      return isWidgetTheme(data.theme) ? { v, type: data.type, theme: data.theme } : null;
    case WidgetMessageType.RESIZE:
      return typeof data.height === 'number' && Number.isFinite(data.height) && data.height >= 0
        ? { v, type: data.type, height: data.height }
        : null;
    case WidgetMessageType.RESERVATION_CREATED:
      return isReservationCreatedPayload(data.reservation)
        ? {
            v,
            type: data.type,
            reservation: toReservationCreatedPayload(
              data.reservation,
              data.reservation.locationName,
            ),
          }
        : null;
    case WidgetMessageType.UNAVAILABLE:
      return typeof data.reason === 'string' &&
        (WIDGET_UNAVAILABLE_REASONS as readonly string[]).includes(data.reason)
        ? { v, type: data.type, reason: data.reason as WidgetUnavailableReason }
        : null;
    default:
      return null;
  }
}
