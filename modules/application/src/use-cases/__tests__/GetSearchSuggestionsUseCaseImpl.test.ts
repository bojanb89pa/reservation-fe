import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSearchSuggestionsUseCaseImpl } from '../search-suggestion/GetSearchSuggestionsUseCaseImpl';
import type { SearchSuggestion, SearchSuggestionRepository, SearchSuggestionsQuery } from '@fe/domain';

const suggestions: SearchSuggestion[] = [
  { type: 'PLACE', id: 'Sarajevo', name: 'Sarajevo' },
  { type: 'CATEGORY', id: '550e8400-e29b-41d4-a716-446655440001', name: 'Frizerski saloni' },
  { type: 'BUSINESS', id: '550e8400-e29b-41d4-a716-446655440002', name: 'Frizerski salon Ana' },
];

let mockRepo: SearchSuggestionRepository;
let useCase: GetSearchSuggestionsUseCaseImpl;

beforeEach(() => {
  mockRepo = {
    getSuggestions: vi.fn().mockResolvedValue(suggestions),
  };
  useCase = new GetSearchSuggestionsUseCaseImpl(mockRepo);
});

describe('GetSearchSuggestionsUseCaseImpl', () => {
  it('returns repository suggestions and forwards the query', async () => {
    const query: SearchSuggestionsQuery = { q: 'fri', lang: 'sr' };

    const result = await useCase.execute(query);

    expect(mockRepo.getSuggestions).toHaveBeenCalledOnce();
    expect(mockRepo.getSuggestions).toHaveBeenCalledWith(query);
    expect(result).toEqual(suggestions);
  });

  it('returns an empty array without calling the repository for an empty query', async () => {
    const result = await useCase.execute({ q: '' });

    expect(result).toEqual([]);
    expect(mockRepo.getSuggestions).not.toHaveBeenCalled();
  });

  it('returns an empty array without calling the repository for a whitespace-only query', async () => {
    const result = await useCase.execute({ q: '   \t ' });

    expect(result).toEqual([]);
    expect(mockRepo.getSuggestions).not.toHaveBeenCalled();
  });

  it('preserves server order without sorting or filtering', async () => {
    const reversed = [...suggestions].reverse();
    vi.mocked(mockRepo.getSuggestions).mockResolvedValue(reversed);

    const result = await useCase.execute({ q: 'fri' });

    expect(result).toBe(reversed);
    expect(result.map((s) => s.type)).toEqual(['BUSINESS', 'CATEGORY', 'PLACE']);
  });

  it('propagates repository errors', async () => {
    const error = new Error('network down');
    vi.mocked(mockRepo.getSuggestions).mockRejectedValue(error);

    await expect(useCase.execute({ q: 'fri' })).rejects.toBe(error);
  });
});
