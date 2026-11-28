// Verzionisan URL slike (epic 123)
//
// `imageUrl` biznisa i `profilePictureUrl` korisnika nose `?v=<verzija>`. Posle zamene slike
// odgovor (i svaki sledeći GET) nosi drugi URL, pa browser ne prikazuje sliku iz jednosatnog
// keša. Posle brisanja polje je `null`. Test radi na API nivou (bez browsera) jer proverava
// ugovor odgovora; prikaz slike u UI-ju pokrivaju `slika-biznisa.spec.ts` i `nalog-korisnika.spec.ts`.

import { deflateSync } from 'node:zlib';
import type { APIResponse } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';

interface BusinessDto {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface UserDto {
  id: string;
  profilePictureUrl: string | null;
}

interface UploadDto {
  uploadId: string;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Validan jednobojan PNG; različita `size` daje različit sadržaj fajla. */
function createPng(size: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0x80)]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

type Poster = (path: string, options: Parameters<ApiClient['post']>[1]) => Promise<APIResponse>;

async function upload(post: Poster, path: string, type: string, size: number): Promise<string> {
  const response = await post(path, {
    multipart: { type, file: { name: 'slika.png', mimeType: 'image/png', buffer: createPng(size) } },
  });
  await expectOk(response, `POST ${path}`);
  return ((await response.json()) as UploadDto).uploadId;
}

test.describe('verzionisan URL slike', () => {
  test('imageUrl biznisa menja verziju posle zamene, a posle brisanja je null', async () => {
    const owner = await createActivatedUser();
    const ownerApi = await ApiClient.as(owner);
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const accounts = await adminApi.auth.get('users/admin/accounts', { params: { search: owner.email } });
      await expectOk(accounts, 'GET /auth/users/admin/accounts');
      const ownerId = ((await accounts.json()) as { content: { id: string; email: string }[] }).content.find(
        (u) => u.email === owner.email,
      )?.id;
      if (!ownerId) throw new Error(`korisnik ${owner.email} nije pronađen u admin pretrazi`);

      const created = await adminApi.post('/businesses/admin', {
        data: {
          name: uniqueName('E2E Verzija'),
          ownerId,
          location: {
            name: 'E2E lokacija',
            addressLine1: uniqueName('Ulica'),
            city: 'Novi Sad',
            postalCode: '21000',
            countryCode: 'RS',
            latitude: 45.2671,
            longitude: 19.8335,
          },
        },
      });
      await expectOk(created, 'POST /businesses/admin');
      const business = (await created.json()) as BusinessDto;
      const path = `/businesses/${business.id}/image`;

      const first = await ownerApi.put(path, {
        data: { uploadId: await upload((p, o) => ownerApi.post(p, o), 'files', 'business-image', 8) },
      });
      await expectOk(first, `PUT ${path}`);
      const firstUrl = ((await first.json()) as BusinessDto).imageUrl;
      expect(firstUrl).toContain(`/businesses/${business.id}/image`);
      expect(firstUrl).toMatch(/\?v=.+/);

      const second = await ownerApi.put(path, {
        data: { uploadId: await upload((p, o) => ownerApi.post(p, o), 'files', 'business-image', 16) },
      });
      await expectOk(second, `PUT ${path} (zamena)`);
      const secondUrl = ((await second.json()) as BusinessDto).imageUrl;
      expect(secondUrl).toMatch(/\?v=.+/);
      expect(secondUrl).not.toBe(firstUrl);

      // Svaki sledeći GET nosi novu verziju.
      const fetched = await ownerApi.get(`/businesses/${business.id}`);
      await expectOk(fetched, `GET /businesses/${business.id}`);
      expect(((await fetched.json()) as BusinessDto).imageUrl).toBe(secondUrl);

      const removed = await ownerApi.delete(path);
      await expectOk(removed, `DELETE ${path}`);
      expect(((await removed.json()) as BusinessDto).imageUrl).toBeNull();

      const afterRemove = await ownerApi.get(`/businesses/${business.id}`);
      await expectOk(afterRemove, `GET /businesses/${business.id}`);
      expect(((await afterRemove.json()) as BusinessDto).imageUrl).toBeNull();
    } finally {
      await ownerApi.dispose();
      await adminApi.dispose();
    }
  });

  test('profilePictureUrl menja verziju posle zamene, a posle brisanja je null', async () => {
    const user = await createActivatedUser();
    const api = await ApiClient.as(user);
    const adminApi = await ApiClient.as(adminCredentials());
    const fetchUser = async (id: string): Promise<UserDto> => {
      const response = await adminApi.auth.get(`users/admin/accounts/${id}`);
      await expectOk(response, `GET /auth/users/admin/accounts/${id}`);
      return (await response.json()) as UserDto;
    };
    try {
      const first = await api.auth.put('users/me/profile-picture', {
        data: { uploadId: await upload((p, o) => api.auth.post(p, o), 'users/files', 'profile-picture', 8) },
      });
      await expectOk(first, 'PUT /auth/users/me/profile-picture');
      const firstBody = (await first.json()) as UserDto;
      expect(firstBody.profilePictureUrl).toContain(`/users/${firstBody.id}/profile-picture`);
      expect(firstBody.profilePictureUrl).toMatch(/\?v=.+/);

      const second = await api.auth.put('users/me/profile-picture', {
        data: { uploadId: await upload((p, o) => api.auth.post(p, o), 'users/files', 'profile-picture', 16) },
      });
      await expectOk(second, 'PUT /auth/users/me/profile-picture (zamena)');
      const secondUrl = ((await second.json()) as UserDto).profilePictureUrl;
      expect(secondUrl).toMatch(/\?v=.+/);
      expect(secondUrl).not.toBe(firstBody.profilePictureUrl);

      expect((await fetchUser(firstBody.id)).profilePictureUrl).toBe(secondUrl);

      const removed = await api.auth.delete('users/me/profile-picture');
      await expectOk(removed, 'DELETE /auth/users/me/profile-picture');
      expect(((await removed.json()) as UserDto).profilePictureUrl).toBeNull();

      expect((await fetchUser(firstBody.id)).profilePictureUrl).toBeNull();
    } finally {
      await api.dispose();
      await adminApi.dispose();
    }
  });
});
