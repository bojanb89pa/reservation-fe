import { describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { SearchSuggestion } from '@fe/domain';
import { SearchSuggestionApiRepository } from '../SearchSuggestionApiRepository';

function makeRepo(get: ReturnType<typeof vi.fn>) {
  return new SearchSuggestionApiRepository({ get } as unknown as AxiosInstance);
}

describe('SearchSuggestionApiRepository', () => {
  it('sends q and lang and keeps server order', async () => {
    const data: SearchSuggestion[] = [
      { type: 'PLACE', id: 'p1', name: 'Beograd' },
      { type: 'CATEGORY', id: 'c1', name: 'Frizeri' },
      { type: 'BUSINESS', id: 'b1', name: 'Salon' },
    ];
    const get = vi.fn().mockResolvedValue({ data });
    const result = await makeRepo(get).getSuggestions({ q: 'be', lang: 'sr' });
    expect(get).toHaveBeenCalledWith('/v1/search/suggestions', {
      params: { q: 'be', lang: 'sr' },
    });
    expect(result).toEqual(data);
  });

  it('omits lang when not provided', async () => {
    const get = vi.fn().mockResolvedValue({ data: [] });
    const result = await makeRepo(get).getSuggestions({ q: 'x' });
    expect(get).toHaveBeenCalledWith('/v1/search/suggestions', { params: { q: 'x' } });
    expect(result).toEqual([]);
  });

  it('propagates client errors unchanged', async () => {
    const error = new Error('boom');
    const get = vi.fn().mockRejectedValue(error);
    await expect(makeRepo(get).getSuggestions({ q: 'x' })).rejects.toBe(error);
  });
});
