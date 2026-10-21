import { describe, expect, it, vi } from 'vitest';
import type { AxiosError, AxiosInstance } from 'axios';
import {
  NotFoundError,
  ReservationSlotTakenError,
  TokenExchangeError,
  TokenExchangeErrorCode,
  UnprocessableEntityError,
} from '@fe/domain';
import { ApiError, normalizeAxiosError, type ApiErrorBody } from '../../api/apiError';
import { ClientApplicationWidgetApiRepository } from '../ClientApplicationWidgetApiRepository';
import { TokenExchangeApiRepository } from '../TokenExchangeApiRepository';

function httpError(
  method: string,
  url: string,
  status: number,
  data: Record<string, unknown> = { message: 'x' },
  requestData?: string,
) {
  return {
    message: 'Request failed',
    config: { method, url, data: requestData },
    response: { status, data },
  } as unknown as AxiosError<ApiErrorBody>;
}

const command = {
  resourceId: 'r1',
  locationId: 'l1',
  serviceId: 's1',
  startTime: '2026-11-01T10:00:00',
  endTime: '2026-11-01T11:00:00',
};

describe('ClientApplicationWidgetApiRepository', () => {
  it('getWidgetConfig calls the public widget-config route without Authorization', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: 'cfg' }) };
    const repo = new ClientApplicationWidgetApiRepository(client as unknown as AxiosInstance);
    await expect(repo.getWidgetConfig('a1')).resolves.toBe('cfg');
    expect(client.get).toHaveBeenCalledWith('/client-applications/a1/widget-config');
  });

  it('createReservation posts with the partner token as Bearer', async () => {
    const client = { post: vi.fn().mockResolvedValue({ data: 'res' }) };
    const repo = new ClientApplicationWidgetApiRepository(client as unknown as AxiosInstance);
    await expect(repo.createReservation('partner-tok', command)).resolves.toBe('res');
    expect(client.post).toHaveBeenCalledWith('/client-applications/reservations', command, {
      headers: { Authorization: 'Bearer partner-tok' },
    });
  });

  it('maps 404 on widget-config to NotFoundError', () => {
    const error = normalizeAxiosError(httpError('get', '/client-applications/a1/widget-config', 404));
    expect(error).toBeInstanceOf(NotFoundError);
  });

  it('maps 409 RESERVATION_SLOT_TAKEN to ReservationSlotTakenError', () => {
    const error = normalizeAxiosError(
      httpError('post', '/client-applications/reservations', 409, {
        message: 'taken',
        code: 'RESERVATION_SLOT_TAKEN',
      }),
    );
    expect(error).toBeInstanceOf(ReservationSlotTakenError);
  });

  it('maps 422 to UnprocessableEntityError and keeps the BE code', () => {
    const error = normalizeAxiosError(
      httpError('post', '/client-applications/reservations', 422, {
        message: 'no consent',
        code: 'CLIENT_APPLICATION_LOCATION_CONSENT_NOT_APPROVED',
      }),
    );
    expect(error).toBeInstanceOf(UnprocessableEntityError);
    expect((error as UnprocessableEntityError).code).toBe(
      'CLIENT_APPLICATION_LOCATION_CONSENT_NOT_APPROVED',
    );
  });

  it('maps 422 without a code to the default UnprocessableEntityError code', () => {
    const error = normalizeAxiosError(httpError('post', '/client-applications/reservations', 422));
    expect(error).toBeInstanceOf(UnprocessableEntityError);
    expect((error as UnprocessableEntityError).code).toBe('UNPROCESSABLE_ENTITY');
  });

  it('maps 404 on reservation create to NotFoundError', () => {
    const error = normalizeAxiosError(httpError('post', '/client-applications/reservations', 404));
    expect(error).toBeInstanceOf(NotFoundError);
  });

  it('keeps 403 as ApiError', () => {
    const error = normalizeAxiosError(httpError('post', '/client-applications/reservations', 403));
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isForbidden).toBe(true);
  });
});

describe('TokenExchangeApiRepository', () => {
  const grant =
    'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Atoken-exchange&client_id=a1&subject_token=jwt';

  it('posts a form-encoded token-exchange request and maps the response', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({
        data: {
          access_token: 'at',
          token_type: 'Bearer',
          expires_in: 600,
          scope: 'reservations:create',
          issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
        },
      }),
    };
    const repo = new TokenExchangeApiRepository(client as unknown as AxiosInstance);
    const result = await repo.exchangeIdentityToken({
      clientApplicationId: 'a1',
      idToken: 'jwt',
      scopes: ['a', 'b'],
    });
    expect(result).toEqual({
      accessToken: 'at',
      tokenType: 'Bearer',
      expiresIn: 600,
      scope: 'reservations:create',
      issuedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
    });
    const [url, body, config] = client.post.mock.calls[0] as [string, URLSearchParams, object];
    expect(url).toBe('/oauth2/token');
    expect(config).toEqual({ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    expect(Object.fromEntries(body)).toEqual({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      client_id: 'a1',
      subject_token: 'jwt',
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      scope: 'a b',
    });
  });

  it('omits scope when none requested', async () => {
    const client = { post: vi.fn().mockResolvedValue({ data: {} }) };
    const repo = new TokenExchangeApiRepository(client as unknown as AxiosInstance);
    await repo.exchangeIdentityToken({ clientApplicationId: 'a1', idToken: 'jwt', scopes: [] });
    const body = client.post.mock.calls[0]?.[1] as URLSearchParams;
    expect(body.has('scope')).toBe(false);
  });

  it('maps an OAuth2 invalid_grant body to TokenExchangeError', () => {
    const error = normalizeAxiosError(
      httpError(
        'post',
        '/oauth2/token',
        400,
        { error: 'invalid_grant', error_description: 'error.external_id_token.audience_mismatch' },
        grant,
      ),
    );
    expect(error).toBeInstanceOf(TokenExchangeError);
    expect((error as TokenExchangeError).code).toBe(TokenExchangeErrorCode.INVALID_GRANT);
    expect((error as TokenExchangeError).errorDescription).toBe(
      'error.external_id_token.audience_mismatch',
    );
  });

  it('maps 401 invalid_client to TokenExchangeError', () => {
    const error = normalizeAxiosError(
      httpError('post', '/oauth2/token', 401, { error: 'invalid_client' }, grant),
    );
    expect(error).toBeInstanceOf(TokenExchangeError);
    expect((error as TokenExchangeError).code).toBe(TokenExchangeErrorCode.INVALID_CLIENT);
  });

  it('does not touch errors of other grants on the token endpoint', () => {
    const error = normalizeAxiosError(
      httpError('post', '/oauth2/token', 400, { error: 'invalid_grant' }, 'grant_type=refresh_token'),
    );
    expect(error).toBeInstanceOf(ApiError);
  });
});
