import { describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { BusinessCategoryApiRepository } from '../BusinessCategoryApiRepository';

function setup() {
  const client = { put: vi.fn().mockResolvedValue({ data: { id: 'c1' } }) };
  const repo = new BusinessCategoryApiRepository(client as unknown as AxiosInstance);
  return { client, repo };
}

describe('BusinessCategoryApiRepository.update', () => {
  it('omits code when it is undefined', async () => {
    const { client, repo } = setup();
    await repo.update('c1', { parentId: null, translations: { en: 'A' } });
    expect(client.put).toHaveBeenCalledWith('/business-categories/c1', {
      parentId: null,
      translations: { en: 'A' },
    });
    expect(client.put.mock.calls[0][1]).not.toHaveProperty('code');
  });

  it.each(['', '   ', null])('omits code when it is %j', async (code) => {
    const { client, repo } = setup();
    await repo.update('c1', { code, translations: { en: 'A' } });
    expect(client.put.mock.calls[0][1]).toEqual({ translations: { en: 'A' } });
    expect(client.put.mock.calls[0][1]).not.toHaveProperty('code');
  });

  it('sends a non-blank code unchanged', async () => {
    const { client, repo } = setup();
    await repo.update('c1', { code: 'spa', parentId: 'p1', translations: { en: 'A' } });
    expect(client.put).toHaveBeenCalledWith('/business-categories/c1', {
      code: 'spa',
      parentId: 'p1',
      translations: { en: 'A' },
    });
  });

  it('propagates errors already normalized by the client interceptor', async () => {
    const { client, repo } = setup();
    const err = new Error('conflict');
    client.put.mockRejectedValue(err);
    await expect(repo.update('c1', { translations: {} })).rejects.toBe(err);
  });
});
