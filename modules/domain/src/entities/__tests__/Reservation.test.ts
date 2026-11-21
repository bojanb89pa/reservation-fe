import { describe, expect, it } from 'vitest';
import { normalizeReservationOrigin } from '../Reservation';

describe('normalizeReservationOrigin', () => {
  it('keeps known origins', () => {
    expect(normalizeReservationOrigin('AI_ASSISTANT')).toBe('AI_ASSISTANT');
    expect(normalizeReservationOrigin('CLIENT_APPLICATION')).toBe('CLIENT_APPLICATION');
    expect(normalizeReservationOrigin('RESERVA_APP')).toBe('RESERVA_APP');
  });

  it('falls back to RESERVA_APP for unknown, null or undefined values', () => {
    expect(normalizeReservationOrigin('SOMETHING_NEW')).toBe('RESERVA_APP');
    expect(normalizeReservationOrigin(null)).toBe('RESERVA_APP');
    expect(normalizeReservationOrigin(undefined)).toBe('RESERVA_APP');
  });
});
