import { describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { NotFoundError } from '@fe/domain';
import { McpClientConsentApiRepository } from '../McpClientConsentApiRepository';
import { normalizeAxiosError } from '../../api/apiError';

const CLIENT_ID = 'https://claude.ai/oauth/client.json?a=b&c=d';

function setup() {
  const client = {
    get: vi.fn().mockResolvedValue({ data: [] }),
    delete: vi.fn().mockResolvedValue({ status: 204, data: undefined }),
  };
  const repo = new McpClientConsentApiRepository(client as unknown as AxiosInstance);
  return { client, repo };
}

describe('McpClientConsentApiRepository.getMine', () => {
  it('sends GET /users/me/mcp-consents and returns the body', async () => {
    const { client, repo } = setup();
    const consents = [
      {
        clientId: CLIENT_ID,
        clientName: 'Claude',
        clientHost: 'claude.ai',
        scopes: ['read'],
        grantedAt: null,
      },
    ];
    client.get.mockResolvedValue({ data: consents });
    await expect(repo.getMine()).resolves.toEqual(consents);
    expect(client.get).toHaveBeenCalledWith('/users/me/mcp-consents');
  });

  it('returns an empty array when there are no consents', async () => {
    const { repo } = setup();
    await expect(repo.getMine()).resolves.toEqual([]);
  });
});

describe('McpClientConsentApiRepository.revoke', () => {
  it('sends DELETE with clientId as a query param and resolves to undefined', async () => {
    const { client, repo } = setup();
    await expect(repo.revoke(CLIENT_ID)).resolves.toBeUndefined();
    expect(client.delete).toHaveBeenCalledWith('/users/me/mcp-consents', {
      params: { clientId: CLIENT_ID },
    });
  });

  it('URL-encodes clientId exactly once when axios builds the request URL', () => {
    const uri = axios.getUri({ url: '/users/me/mcp-consents', params: { clientId: CLIENT_ID } });
    expect(uri).toContain('clientId=https:');
    expect(uri).toContain(encodeURIComponent('?a=b&c=d'));
    expect(uri).not.toContain('%25');
  });

  it('propagates errors from the client', async () => {
    const { client, repo } = setup();
    const err = new Error('boom');
    client.delete.mockRejectedValue(err);
    await expect(repo.revoke(CLIENT_ID)).rejects.toBe(err);
  });
});

describe('normalizeAxiosError for DELETE /users/me/mcp-consents', () => {
  it('maps 404 to NotFoundError', () => {
    const config = {
      url: '/users/me/mcp-consents',
      method: 'delete',
      params: { clientId: CLIENT_ID },
    } as unknown as InternalAxiosRequestConfig;
    const error = new AxiosError('Not found', '404', config, null, {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config,
      data: { message: 'error.mcp.client_consent_not_found' },
    });
    expect(normalizeAxiosError(error)).toBeInstanceOf(NotFoundError);
  });
});
