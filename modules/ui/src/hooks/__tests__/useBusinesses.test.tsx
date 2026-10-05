import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const execute = vi.hoisted(() => vi.fn());

vi.mock('../../app/container', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  tokenStorage: {
    getAccessToken: () => null,
    setAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    setIdToken: vi.fn(),
    clear: vi.fn(),
  },
  getMyBusinessesUseCase: { execute },
  getAllBusinessesForAdminUseCase: { execute: vi.fn() },
  searchBusinessesUseCase: { execute: vi.fn() },
  getBusinessUseCase: { execute: vi.fn() },
  submitBusinessUseCase: { execute: vi.fn() },
  createBusinessByAdminUseCase: { execute: vi.fn() },
  activateBusinessUseCase: { execute: vi.fn() },
  rejectBusinessUseCase: { execute: vi.fn() },
  setBusinessCategoryUseCase: { execute: vi.fn() },
  getBusinessesByCategoryUseCase: { execute: vi.fn() },
  setBusinessImageUseCase: { execute: vi.fn() },
  removeBusinessImageUseCase: { execute: vi.fn() },
}));

import { useHasActiveBusiness, useHasBusinessMembership } from '../useBusinesses';
import { useAuthStore } from '../../state/authStore';

function wrapperAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const hooks = [
  ['useHasActiveBusiness', useHasActiveBusiness],
  ['useHasBusinessMembership', useHasBusinessMembership],
] as const;

describe.each(hooks)('%s', (_name, useHook) => {
  beforeEach(() => {
    execute.mockReset();
    execute.mockResolvedValue({ content: [{ status: 'ACTIVE' }], totalElements: 1 });
    useAuthStore.setState({ session: null, isAuthenticated: false });
  });

  it('does not query when the user is not authenticated', async () => {
    renderHook(() => useHook(), { wrapper: wrapperAt('/') });
    await new Promise((r) => setTimeout(r, 20));
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not query on /callback even if the store claims authentication', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    renderHook(() => useHook(), { wrapper: wrapperAt('/callback') });
    await new Promise((r) => setTimeout(r, 20));
    expect(execute).not.toHaveBeenCalled();
  });

  it('queries when authenticated on a regular route', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const { result } = renderHook(() => useHook(), { wrapper: wrapperAt('/') });
    await waitFor(() => expect(result.current).toBe(true));
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
