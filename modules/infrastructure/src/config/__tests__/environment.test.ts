import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadEnv() {
  vi.resetModules();
  return (await import('../environment')).env;
}

describe('env.appSiteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns VITE_APP_SITE_URL when set', async () => {
    vi.stubEnv('VITE_APP_SITE_URL', 'http://reserva.bojanlab.com/');
    expect((await loadEnv()).appSiteUrl).toBe('http://reserva.bojanlab.com/');
  });

  it('falls back to window.location.origin when empty', async () => {
    vi.stubEnv('VITE_APP_SITE_URL', '');
    expect((await loadEnv()).appSiteUrl).toBe(window.location.origin);
  });

  it('falls back to window.location.origin when not set', async () => {
    expect((await loadEnv()).appSiteUrl).toBe(window.location.origin);
  });
});
