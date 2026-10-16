import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getSearchSuggestionsUseCase } from '../app/container';

export const SEARCH_SUGGESTIONS_DEBOUNCE_MS = 250;

export const searchSuggestionKeys = {
  suggestions: (q: string, lang: string) => ['search', 'suggestions', q, lang] as const,
};

export function useSearchSuggestions(input: string) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setDebounced('');
      return;
    }
    const timer = setTimeout(() => setDebounced(trimmed), SEARCH_SUGGESTIONS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  return useQuery({
    queryKey: searchSuggestionKeys.suggestions(debounced, lang),
    queryFn: () => getSearchSuggestionsUseCase.execute({ q: debounced, lang }),
    enabled: debounced.length > 0,
    staleTime: 30_000,
  });
}
