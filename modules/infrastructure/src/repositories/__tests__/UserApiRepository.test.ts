import { describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { UserApiRepository } from '../UserApiRepository';

function setup() {
  const client = { patch: vi.fn().mockResolvedValue({ data: { id: 'u1', firstName: 'Ana' } }) };
  const repo = new UserApiRepository(client as unknown as AxiosInstance);
  return { client, repo };
}

describe('UserApiRepository.updateOwnProfile', () => {
  it('sends PATCH /users/me with only firstName and lastName', async () => {
    const { client, repo } = setup();
    const command = { firstName: 'Ana', lastName: 'Anić', email: 'x@y.z' };
    await repo.updateOwnProfile(command);
    expect(client.patch).toHaveBeenCalledWith('/users/me', {
      firstName: 'Ana',
      lastName: 'Anić',
    });
  });

  it('returns the response body', async () => {
    const { repo } = setup();
    await expect(repo.updateOwnProfile({ firstName: 'Ana', lastName: 'Anić' })).resolves.toEqual({
      id: 'u1',
      firstName: 'Ana',
    });
  });

  it('propagates errors already normalized by the client interceptor', async () => {
    const { client, repo } = setup();
    const err = new Error('unprocessable');
    client.patch.mockRejectedValue(err);
    await expect(repo.updateOwnProfile({ firstName: '', lastName: '' })).rejects.toBe(err);
  });
});
