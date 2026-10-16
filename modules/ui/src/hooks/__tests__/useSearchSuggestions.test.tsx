import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const execute = vi.hoisted(() => vi.fn());
const language = vi.hoisted(() => ({ current: 'sr' }));

vi.mock('../../app/container', () => ({
  getSearchSuggestionsUseCase: { execute },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: language.current } }),
}));

import { useSearchSuggestions } from '../useSearchSuggestions';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useSearchSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    execute.mockReset();
    execute.mockResolvedValue([{ type: 'PLACE', id: 'Beograd', name: 'Beograd' }]);
    language.current = 'sr';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call the use case for empty or blank input', async () => {
    const { result } = renderHook(() => useSearchSuggestions('   '), { wrapper: wrapper() });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(execute).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('debounces input by 250 ms and passes the current language', async () => {
    const { result, rerender } = renderHook(({ q }) => useSearchSuggestions(q), {
      wrapper: wrapper(),
      initialProps: { q: 'be' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    rerender({ q: 'beo' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(execute).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({ q: 'beo', lang: 'sr' });
  });

  it('trims the query before calling the use case', async () => {
    const { result } = renderHook(() => useSearchSuggestions('  salon '), { wrapper: wrapper() });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(260);
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(execute).toHaveBeenCalledWith({ q: 'salon', lang: 'sr' });
  });
});
