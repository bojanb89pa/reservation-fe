import { describe, expect, it } from 'vitest';
import type { AxiosError } from 'axios';
import { ConflictError, ReservationSlotTakenError } from '@domain';
import { ApiError, normalizeAxiosError, type ApiErrorBody } from '../apiError';

function make(
  method: string,
  url: string,
  status: number,
  data: ApiErrorBody,
): AxiosError<ApiErrorBody> {
  return {
    message: 'Request failed',
    config: { method, url },
    response: { status, data },
  } as unknown as AxiosError<ApiErrorBody>;
}

describe('normalizeAxiosError RESERVATION_SLOT_TAKEN', () => {
  const body = { message: 'Termin je zauzet', code: 'RESERVATION_SLOT_TAKEN' };

  it.each([
    '/resources/r1/reservations',
    '/resources/r1/reservations/x1/approve',
    '/client-applications/reservations',
  ])('maps 409 on POST %s', (url) => {
    const result = normalizeAxiosError(make('post', url, 409, body));
    expect(result).toBeInstanceOf(ReservationSlotTakenError);
    expect(result.message).toBe('Termin je zauzet');
  });

  it('does not map other statuses', () => {
    const result = normalizeAxiosError(make('post', '/resources/r1/reservations', 400, body));
    expect(result).toBeInstanceOf(ApiError);
  });

  it('maps owner_required 409 on the setting route to ConflictError', () => {
    const result = normalizeAxiosError(
      make('patch', '/businesses/b1/overlapping-pending-reservations', 409, {
        message: 'error.business.owner_required',
        code: 'error.business.owner_required',
      }),
    );
    expect(result).toBeInstanceOf(ConflictError);
  });
});
