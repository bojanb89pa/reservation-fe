import { describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { DiscoverySearchApiRepository } from '../DiscoverySearchApiRepository';

vi.mock('../../config/environment', () => ({
  env: { resourceBaseUrl: 'http://localhost:8080/api' },
}));

describe('DiscoverySearchApiRepository image URLs', () => {
  it('resolves relative imageUrl and keeps null', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        data: {
          content: [
            { businessId: 'a', imageUrl: '/api/businesses/a/image' },
            { businessId: 'b', imageUrl: null },
          ],
          page: 0,
        },
      }),
    };
    const repo = new DiscoverySearchApiRepository(client as unknown as AxiosInstance);
    const result = await repo.search({ q: 'x' }, { page: 0, size: 10 });
    expect(result.content.map((r) => r.imageUrl)).toEqual([
      'http://localhost:8080/api/businesses/a/image',
      null,
    ]);
    expect(result.page).toBe(0);
  });
});
