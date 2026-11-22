import { describe, expect, it } from 'vitest';
import type { AxiosError } from 'axios';
import { ConflictError, ReservationSlotTakenError, UnprocessableEntityError } from '@fe/domain';
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

describe('normalizeAxiosError cancellation deadline', () => {
  it('maps owner_required 409 on PUT/DELETE cancellation-deadline to ConflictError', () => {
    for (const method of ['put', 'delete']) {
      const result = normalizeAxiosError(
        make(method, '/businesses/b1/cancellation-deadline', 409, {
          message: 'Samo vlasnik',
          code: 'error.business.owner_required',
        }),
      );
      expect(result).toBeInstanceOf(ConflictError);
      expect(result.message).toBe('Samo vlasnik');
    }
  });

  it('maps invalid min notice 422 to UnprocessableEntityError with the BE code', () => {
    const result = normalizeAxiosError(
      make('put', '/businesses/b1/cancellation-deadline', 422, {
        message: 'Rok van opsega',
        code: 'error.business.cancellation_min_notice_invalid',
      }),
    );
    expect(result).toBeInstanceOf(UnprocessableEntityError);
    expect(result.message).toBe('Rok van opsega');
    expect((result as UnprocessableEntityError).code).toBe(
      'error.business.cancellation_min_notice_invalid',
    );
  });

  it('maps deadline passed 422 on reservation cancel with the BE code', () => {
    const result = normalizeAxiosError(
      make('post', '/resources/r1/reservations/x1/cancel', 422, {
        message: 'Rok je istekao',
        code: 'error.reservation.cancellation_deadline_passed',
      }),
    );
    expect(result).toBeInstanceOf(UnprocessableEntityError);
    expect(result.message).toBe('Rok je istekao');
    expect((result as UnprocessableEntityError).code).toBe(
      'error.reservation.cancellation_deadline_passed',
    );
  });

  it('keeps other cancel 422 as UnprocessableEntityError', () => {
    const result = normalizeAxiosError(
      make('post', '/resources/r1/reservations/x1/cancel', 422, { message: 'x' }),
    );
    expect(result).toBeInstanceOf(UnprocessableEntityError);
  });
});
