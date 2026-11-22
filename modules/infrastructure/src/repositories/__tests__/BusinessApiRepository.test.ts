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

describe('BusinessApiRepository.updateOverlappingPendingSetting', () => {
  it('PATCHes the setting and returns the business with the flag', async () => {
    const client = {
      patch: vi.fn().mockResolvedValue({
        data: { id: 'abc', imageUrl: null, allowOverlappingPendingReservations: false },
      }),
    };
    const repo = new BusinessApiRepository(client as unknown as AxiosInstance);
    const result = await repo.updateOverlappingPendingSetting('abc', {
      allowOverlappingPendingReservations: false,
    });
    expect(client.patch).toHaveBeenCalledWith('/businesses/abc/overlapping-pending-reservations', {
      allowOverlappingPendingReservations: false,
    });
    expect(result.allowOverlappingPendingReservations).toBe(false);
  });

  it('passes allowOverlappingPendingReservations through getById', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        data: { id: 'abc', imageUrl: null, allowOverlappingPendingReservations: true },
      }),
    };
    const repo = new BusinessApiRepository(client as unknown as AxiosInstance);
    expect((await repo.getById('abc')).allowOverlappingPendingReservations).toBe(true);
  });
});

describe('BusinessApiRepository cancellation deadline', () => {
  it('PUTs the deadline and returns the business', async () => {
    const client = {
      put: vi.fn().mockResolvedValue({ data: { id: 'abc', imageUrl: null, minNoticeMinutes: 60 } }),
    };
    const repo = new BusinessApiRepository(client as unknown as AxiosInstance);
    const result = await repo.setCancellationDeadline('abc', { minNoticeMinutes: 60 });
    expect(client.put).toHaveBeenCalledWith('/businesses/abc/cancellation-deadline', {
      minNoticeMinutes: 60,
    });
    expect(result.minNoticeMinutes).toBe(60);
  });

  it('DELETEs the deadline without a body', async () => {
    const client = {
      delete: vi
        .fn()
        .mockResolvedValue({ data: { id: 'abc', imageUrl: null, minNoticeMinutes: null } }),
    };
    const repo = new BusinessApiRepository(client as unknown as AxiosInstance);
    const result = await repo.removeCancellationDeadline('abc');
    expect(client.delete).toHaveBeenCalledWith('/businesses/abc/cancellation-deadline');
    expect(result.minNoticeMinutes).toBeNull();
  });

  it('maps minNoticeMinutes in getById and defaults a missing field to null', async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ data: { id: 'abc', imageUrl: null, minNoticeMinutes: 30 } })
        .mockResolvedValueOnce({ data: { id: 'abc', imageUrl: null } }),
    };
    const repo = new BusinessApiRepository(client as unknown as AxiosInstance);
    expect((await repo.getById('abc')).minNoticeMinutes).toBe(30);
    expect((await repo.getById('abc')).minNoticeMinutes).toBeNull();
  });

  it('maps minNoticeMinutes in paged results', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        data: {
          content: [
            { id: 'a', imageUrl: null },
            { id: 'b', imageUrl: null, minNoticeMinutes: 5 },
          ],
          page: 0,
        },
      }),
    };
    const repo = new BusinessApiRepository(client as unknown as AxiosInstance);
    const result = await repo.search({ query: 'x', categoryIds: [] }, { page: 0, size: 10 });
    expect(result.content.map((b) => b.minNoticeMinutes)).toEqual([null, 5]);
  });
});
