import { describe, it, expect } from 'vitest';
import {
  WIDGET_PROTOCOL_VERSION,
  WidgetMessageType,
  parseWidgetMessage,
  toReservationCreatedPayload,
} from '../WidgetMessage';
import type { ClientApplicationReservation } from '../ClientApplicationReservation';

const v = WIDGET_PROTOCOL_VERSION;

const reservation: ClientApplicationReservation = {
  id: 'r-1',
  userId: 'u-1',
  resourceId: 'res-1',
  serviceId: 's-1',
  startTime: '2026-11-01T10:00:00',
  endTime: '2026-11-01T11:00:00',
  status: 'PENDING_APPROVAL',
  service: null,
  resource: null,
  business: { id: 'b-1', name: 'Biz' },
};

describe('toReservationCreatedPayload', () => {
  it('keeps only id, status, start, end and location name', () => {
    expect(toReservationCreatedPayload(reservation, 'Centar')).toEqual({
      id: 'r-1',
      status: 'PENDING_APPROVAL',
      startTime: '2026-11-01T10:00:00',
      endTime: '2026-11-01T11:00:00',
      locationName: 'Centar',
    });
  });
});

describe('parseWidgetMessage', () => {
  it('accepts every message type of the current version', () => {
    expect(parseWidgetMessage({ v, type: WidgetMessageType.READY })).toEqual({
      v,
      type: 'reserva:ready',
    });
    expect(parseWidgetMessage({ v, type: WidgetMessageType.NEED_IDENTITY })).toEqual({
      v,
      type: 'reserva:need-identity',
    });
    expect(parseWidgetMessage({ v, type: WidgetMessageType.SIGN_IN_REQUIRED })).toEqual({
      v,
      type: 'reserva:sign-in-required',
    });
    expect(parseWidgetMessage({ v, type: WidgetMessageType.IDENTITY, idToken: null })).toEqual({
      v,
      type: 'reserva:identity',
      idToken: null,
    });
    expect(parseWidgetMessage({ v, type: WidgetMessageType.RESIZE, height: 420 })).toEqual({
      v,
      type: 'reserva:resize',
      height: 420,
    });
    expect(
      parseWidgetMessage({ v, type: WidgetMessageType.UNAVAILABLE, reason: 'PARTNER_DISABLED' }),
    ).toEqual({ v, type: 'reserva:unavailable', reason: 'PARTNER_DISABLED' });
  });

  it('keeps a known identity token type and rejects an unknown one', () => {
    expect(
      parseWidgetMessage({ v, type: WidgetMessageType.IDENTITY, idToken: 'jwt', tokenType: 'jwt' }),
    ).toEqual({ v, type: 'reserva:identity', idToken: 'jwt', tokenType: 'jwt' });
    expect(
      parseWidgetMessage({ v, type: WidgetMessageType.IDENTITY, idToken: 't', tokenType: 'saml' }),
    ).toBeNull();
  });

  it('strips extra fields from the reservation-created payload', () => {
    const parsed = parseWidgetMessage({
      v,
      type: WidgetMessageType.RESERVATION_CREATED,
      reservation: { ...toReservationCreatedPayload(reservation, null), email: 'a@b.c' },
      extra: true,
    });
    expect(parsed).toEqual({
      v,
      type: 'reserva:reservation-created',
      reservation: toReservationCreatedPayload(reservation, null),
    });
  });

  it('rejects wrong version, unknown type and malformed fields', () => {
    expect(parseWidgetMessage(null)).toBeNull();
    expect(parseWidgetMessage('reserva:ready')).toBeNull();
    expect(parseWidgetMessage({ v: 2, type: WidgetMessageType.READY })).toBeNull();
    expect(parseWidgetMessage({ v, type: 'reserva:unknown' })).toBeNull();
    expect(parseWidgetMessage({ v, type: WidgetMessageType.IDENTITY, idToken: 5 })).toBeNull();
    expect(parseWidgetMessage({ v, type: WidgetMessageType.RESIZE, height: -1 })).toBeNull();
    expect(parseWidgetMessage({ v, type: WidgetMessageType.RESIZE, height: Infinity })).toBeNull();
    expect(
      parseWidgetMessage({ v, type: WidgetMessageType.UNAVAILABLE, reason: 'NOPE' }),
    ).toBeNull();
    expect(
      parseWidgetMessage({
        v,
        type: WidgetMessageType.RESERVATION_CREATED,
        reservation: { id: 'r-1' },
      }),
    ).toBeNull();
  });
});
