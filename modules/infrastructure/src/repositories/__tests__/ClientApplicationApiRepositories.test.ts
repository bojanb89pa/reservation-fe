import { describe, expect, it, vi } from 'vitest';
import type { AxiosError, AxiosInstance } from 'axios';
import { NotFoundError, UnprocessableEntityError, ValidationError } from '@fe/domain';
import { ApiError, normalizeAxiosError, type ApiErrorBody } from '../../api/apiError';
import { ClientApplicationApiRepository } from '../ClientApplicationApiRepository';
import { ClientApplicationIntegrationApiRepository } from '../ClientApplicationIntegrationApiRepository';
import { ClientApplicationConsentApiRepository } from '../ClientApplicationConsentApiRepository';

function httpError(method: string, url: string, status: number, message = 'x') {
  return {
    message: 'Request failed',
    config: { method, url },
    response: { status, data: { message } },
  } as unknown as AxiosError<ApiErrorBody>;
}

function mockClient() {
  return {
    get: vi.fn().mockResolvedValue({ data: 'body' }),
    post: vi.fn().mockResolvedValue({ data: 'body' }),
    put: vi.fn().mockResolvedValue({ data: 'body' }),
  };
}

describe('ClientApplicationApiRepository', () => {
  it('getAll calls GET /admin/client-applications', async () => {
    const client = mockClient();
    const repo = new ClientApplicationApiRepository(client as unknown as AxiosInstance);
    await expect(repo.getAll()).resolves.toBe('body');
    expect(client.get).toHaveBeenCalledWith('/admin/client-applications');
  });

  it('getById calls GET /admin/client-applications/{id}', async () => {
    const client = mockClient();
    const repo = new ClientApplicationApiRepository(client as unknown as AxiosInstance);
    await expect(repo.getById('a1')).resolves.toBe('body');
    expect(client.get).toHaveBeenCalledWith('/admin/client-applications/a1');
  });
});

describe('ClientApplicationIntegrationApiRepository', () => {
  function setup() {
    const client = mockClient();
    const publicClient = mockClient();
    const repo = new ClientApplicationIntegrationApiRepository(
      client as unknown as AxiosInstance,
      publicClient as unknown as AxiosInstance,
    );
    return { client, publicClient, repo };
  }

  it('getIntegration calls the admin route', async () => {
    const { client, repo } = setup();
    await repo.getIntegration('a1');
    expect(client.get).toHaveBeenCalledWith('/admin/client-applications/a1/integration');
  });

  it('updateIntegration sends the body without clientApplicationId', async () => {
    const { client, repo } = setup();
    await repo.updateIntegration({
      clientApplicationId: 'a1',
      trustedIssuers: [],
      allowedOrigins: ['https://a.rs'],
      allowedScopes: ['reservation:create'],
    });
    expect(client.put).toHaveBeenCalledWith('/admin/client-applications/a1/integration', {
      trustedIssuers: [],
      allowedOrigins: ['https://a.rs'],
      allowedScopes: ['reservation:create'],
    });
  });

  it('getPublicIntegration uses the public client', async () => {
    const { client, publicClient, repo } = setup();
    await expect(repo.getPublicIntegration('a1')).resolves.toBe('body');
    expect(publicClient.get).toHaveBeenCalledWith('/client-applications/a1/integration');
    expect(client.get).not.toHaveBeenCalled();
  });

  it('getPublicIntegration returns null on 404', async () => {
    const { publicClient, repo } = setup();
    publicClient.get.mockRejectedValue(
      normalizeAxiosError(httpError('get', '/client-applications/a1/integration', 404)),
    );
    await expect(repo.getPublicIntegration('a1')).resolves.toBeNull();
  });

  it('getPublicIntegration rethrows other errors', async () => {
    const { publicClient, repo } = setup();
    const err = new ApiError('boom', 500);
    publicClient.get.mockRejectedValue(err);
    await expect(repo.getPublicIntegration('a1')).rejects.toBe(err);
  });
});

describe('ClientApplicationConsentApiRepository', () => {
  it('calls the consent routes', async () => {
    const client = mockClient();
    const repo = new ClientApplicationConsentApiRepository(client as unknown as AxiosInstance);
    await repo.getMine();
    await repo.approve('c1');
    await repo.revoke('c1');
    expect(client.get).toHaveBeenCalledWith('/client-application-consents');
    expect(client.post).toHaveBeenCalledWith('/client-application-consents/c1/approve');
    expect(client.post).toHaveBeenCalledWith('/client-application-consents/c1/revoke');
  });
});

describe('normalizeAxiosError client applications', () => {
  it('maps 404 on detail, integration and consent routes to NotFoundError', () => {
    for (const [method, url] of [
      ['get', '/admin/client-applications/a1'],
      ['put', '/admin/client-applications/a1/integration'],
      ['post', '/client-application-consents/c1/approve'],
      ['post', '/client-application-consents/c1/revoke'],
    ]) {
      expect(normalizeAxiosError(httpError(method, url, 404))).toBeInstanceOf(NotFoundError);
    }
  });

  it('maps 422 and 400 on integration update', () => {
    const url = '/admin/client-applications/a1/integration';
    const unprocessable = normalizeAxiosError(
      httpError('put', url, 422, 'error.client_application_integration.issuer_invalid'),
    );
    expect(unprocessable).toBeInstanceOf(UnprocessableEntityError);
    expect(unprocessable.message).toBe('error.client_application_integration.issuer_invalid');
    expect(normalizeAxiosError(httpError('put', url, 400))).toBeInstanceOf(ValidationError);
  });

  it('keeps the public integration 404 and register errors as ApiError', () => {
    expect(
      normalizeAxiosError(httpError('get', '/client-applications/a1/integration', 404)),
    ).toBeInstanceOf(ApiError);
    expect(
      normalizeAxiosError(httpError('post', '/admin/client-applications', 404)),
    ).toBeInstanceOf(ApiError);
  });
});
