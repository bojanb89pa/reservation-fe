import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Business } from '@fe/domain';

const execute = vi.hoisted(() => vi.fn());

vi.mock('../../app/container', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  tokenStorage: { getAccessToken: () => null },
  getAllBusinessesForAdminUseCase: { execute },
}));

import { useAllBusinessesForAdminComplete } from '../useBusinesses';

function business(id: string): Business {
  return {
    id,
    name: `Biz ${id}`,
    status: 'ACTIVE',
    ownerId: 'o',
    categoryId: null,
    category: null,
    imageUrl: null,
    allowOverlappingPendingReservations: true,
  };
}

function pageOf(page: number, totalPages: number) {
  return {
    content: [business(`b${page}`)],
    page,
    size: 100,
    totalElements: totalPages,
    totalPages,
    nextCursor: null,
    prevCursor: null,
    hasNext: page + 1 < totalPages,
    hasPrevious: page > 0,
  };
}

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('useAllBusinessesForAdminComplete', () => {
  beforeEach(() => {
    execute.mockReset();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('loads every page until totalPages is reached', async () => {
    execute.mockImplementation(async ({ page }: { page: number }) => pageOf(page, 3));
    const { result } = renderHook(() => useAllBusinessesForAdminComplete(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((b) => b.id)).toEqual(['b0', 'b1', 'b2']);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenLastCalledWith({ page: 2, size: 100 });
  });

  it('stops at the 20 page upper bound', async () => {
    execute.mockImplementation(async ({ page }: { page: number }) => pageOf(page, 50));
    const { result } = renderHook(() => useAllBusinessesForAdminComplete(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(execute).toHaveBeenCalledTimes(20);
    expect(result.current.data).toHaveLength(20);
  });
});
