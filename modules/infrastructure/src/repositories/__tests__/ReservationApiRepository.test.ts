import { describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { ReservationApiRepository } from '../ReservationApiRepository';

const base = {
  id: 'r1',
  userId: 'u1',
  resourceId: 'res1',
  serviceId: 's1',
  startTime: '2026-01-01T10:00:00Z',
  endTime: '2026-01-01T11:00:00Z',
  status: 'CONFIRMED',
  service: null,
  resource: null,
  business: null,
};

function setup(data: unknown) {
  const client = {
    get: vi.fn().mockResolvedValue({ data }),
    post: vi.fn().mockResolvedValue({ data }),
  };
  const repo = new ReservationApiRepository(client as unknown as AxiosInstance);
  return { client, repo };
}

describe('ReservationApiRepository origin mapping', () => {
  it('getAll maps origin and originClient on every item', async () => {
    const { repo } = setup([
      { ...base, origin: 'AI_ASSISTANT', originClient: 'Claude' },
      { ...base, id: 'r2', origin: 'CLIENT_APPLICATION', originClient: null },
    ]);
    const result = await repo.getAll();
    expect(result[0]).toMatchObject({ origin: 'AI_ASSISTANT', originClient: 'Claude' });
    expect(result[1]).toMatchObject({ origin: 'CLIENT_APPLICATION', originClient: null });
  });

  it('getById maps origin and originClient', async () => {
    const { repo } = setup({ ...base, origin: 'AI_ASSISTANT', originClient: 'Claude' });
    await expect(repo.getById('r1')).resolves.toMatchObject({
      origin: 'AI_ASSISTANT',
      originClient: 'Claude',
    });
  });

  it('falls back to RESERVA_APP for unknown origin and null for missing originClient', async () => {
    const { repo } = setup({ ...base, origin: 'SOMETHING_NEW' });
    await expect(repo.getById('r1')).resolves.toMatchObject({
      origin: 'RESERVA_APP',
      originClient: null,
    });
  });

  it('falls back to RESERVA_APP when origin is missing', async () => {
    const { repo } = setup({ ...base });
    await expect(repo.getById('r1')).resolves.toMatchObject({ origin: 'RESERVA_APP' });
  });

  it.each(['approve', 'reject', 'cancel'] as const)('%s maps origin fields', async (method) => {
    const { client, repo } = setup({ ...base, origin: 'AI_ASSISTANT', originClient: 'Claude' });
    const result = await repo[method]('res1', 'r1');
    expect(client.post).toHaveBeenCalledWith(`/resources/res1/reservations/r1/${method}`);
    expect(result).toMatchObject({ origin: 'AI_ASSISTANT', originClient: 'Claude' });
  });

  it('create maps origin fields and keeps request body unchanged', async () => {
    const { client, repo } = setup({ ...base, origin: 'CLIENT_APPLICATION', originClient: null });
    const result = await repo.create('res1', {
      resourceId: 'res1',
      serviceId: 's1',
      startTime: base.startTime,
      endTime: base.endTime,
    });
    expect(client.post).toHaveBeenCalledWith('/resources/res1/reservations', {
      id: null,
      userId: null,
      resourceId: 'res1',
      serviceId: 's1',
      startTime: base.startTime,
      endTime: base.endTime,
    });
    expect(result).toMatchObject({ origin: 'CLIENT_APPLICATION', originClient: null });
  });
});
