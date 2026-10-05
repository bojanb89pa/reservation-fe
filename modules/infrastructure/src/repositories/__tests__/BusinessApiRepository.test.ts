import { describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { BusinessApiRepository } from '../BusinessApiRepository';

vi.mock('../../config/environment', () => ({
  env: { resourceBaseUrl: 'http://localhost:8080/api' },
}));

describe('BusinessApiRepository image URLs', () => {
  const rel = '/api/businesses/abc/image';
  const expected = 'http://localhost:8080/api/businesses/abc/image';

  it('resolves imageUrl in getById', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: { id: 'abc', imageUrl: rel } }) };
    const repo = new BusinessApiRepository(client as unknown as AxiosInstance);
    expect((await repo.getById('abc')).imageUrl).toBe(expected);
  });

  it('resolves imageUrl in paged results and keeps null', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        data: {
          content: [
            { id: 'a', imageUrl: rel },
            { id: 'b', imageUrl: null },
          ],
          page: 0,
        },
      }),
    };
    const repo = new BusinessApiRepository(client as unknown as AxiosInstance);
    const result = await repo.getMyBusinesses({ page: 0, size: 10 });
    expect(result.content.map((b) => b.imageUrl)).toEqual([expected, null]);
  });
});
