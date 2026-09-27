import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const { mockRefreshToken } = vi.hoisted(() => ({
  mockRefreshToken: vi.fn(),
}));

vi.mock('../../repositories/AuthApiRepository', () => ({
  AuthApiRepository: vi.fn().mockImplementation(() => ({
    refreshToken: mockRefreshToken,
  })),
}));

/** Simulates the resource server rejecting every request with 401, without a real network call. */
function unauthorizedAdapter(config: InternalAxiosRequestConfig) {
  const response: AxiosResponse = {
    status: 401,
    statusText: 'Unauthorized',
    data: { message: 'Unauthorized' },
    headers: {},
    config,
  };
  return Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, response));
}

describe('attachAuthInterceptors — session-expiry redirect deduplication', () => {
  let hrefAssignments: string[];

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    mockRefreshToken.mockReset();

    hrefAssignments = [];
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: {
        ...window.location,
        get href() {
          return hrefAssignments[hrefAssignments.length - 1] ?? '';
        },
        set href(value: string) {
          hrefAssignments.push(value);
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to the OAuth authorize screen at most once when several concurrent requests 401 and the refresh token is also invalid', async () => {
    const { attachAuthInterceptors } = await import('../authInterceptors');
    const { tokenStorage } = await import('../tokenStorage');

    tokenStorage.setAccessToken('not-a-real-jwt');
    tokenStorage.setRefreshToken('stale-refresh-token');

    mockRefreshToken.mockRejectedValue(new Error('invalid_grant'));

    const client = axios.create({ adapter: unauthorizedAdapter });
    attachAuthInterceptors(client);

    const results = await Promise.allSettled([client.get('/a'), client.get('/b'), client.get('/c')]);

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    // The refresh call itself was already deduplicated before this ticket; kept here as a sanity check.
    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    // This is the actual fix: three concurrent 401s must not fire three separate redirects.
    expect(hrefAssignments).toHaveLength(1);
    expect(hrefAssignments[0]).toContain('/oauth2/authorize');
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });
});
