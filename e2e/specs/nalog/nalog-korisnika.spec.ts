// E2E-018 · Nalog korisnika
//
// `/account`: izmena imena (čuva se i vidi posle osvežavanja) i upload/brisanje
// profilne slike. Bez slike Avatar prikazuje inicijale (`role="img"` div), a sa
// slikom pravi <img>; razlika se prepoznaje po statusu sekcije ("Picture set" /
// "No picture yet") i po tome da li je element <img> sa učitanim sadržajem.
//
// Prvi kriterijum (izmena imena) je prebačen na bojanb89pa/reservation-agents#50
// (BE self-update endpoint + forma na `/account`). Do tada je test `test.fixme`;
// e2e sloj tog epica ga aktivira i po potrebi uskladi labele.

import { deflateSync } from 'node:zlib';
import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { createActivatedUser } from '../../fixtures/api';
import { env } from '../../env';

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

/** Validan jednobojan PNG 8×8 koji browser sigurno dekodira. */
function createPng(size = 8): Buffer {
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

const PNG = createPng();

async function openAccount(page: Page): Promise<void> {
  await page.goto('/account');
  await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible();
}

test.describe('E2E-018 nalog korisnika', () => {
  test.describe.configure({ timeout: 90_000 });

  // Isključeno dok se ne napravi forma: reservation-agents#50.
  test.fixme('izmena imena se čuva i vidi posle osvežavanja', async ({ page, loginAs }) => {
    const user = await createActivatedUser({ firstName: 'Pocetno', lastName: 'Prezime' });
    await loginAs(user);
    await openAccount(page);

    await page.getByLabel('First name').fill('Izmenjeno');
    await page.getByLabel('Last name').fill('Novoprezime');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByLabel('First name')).toHaveValue('Izmenjeno');

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible();
    await expect(page.getByLabel('First name')).toHaveValue('Izmenjeno');
    await expect(page.getByLabel('Last name')).toHaveValue('Novoprezime');
  });

  test('upload i brisanje profilne slike', async ({ page, loginAs }) => {
    const user = await createActivatedUser({ firstName: 'Slika', lastName: 'Korisnik' });
    const alt = 'Photo of Slika Korisnik';
    await loginAs(user);

    // `profilePictureUrl` je relativan (`/auth/users/<id>/profile-picture`) i u produkciji ga
    // gateway šalje auth-servisu. `yarn preview` u CI-ju nema proxy, pa isti put radimo ovde.
    const authOrigin = new URL(env.authUrl).origin;
    await page.route('**/auth/users/*/profile-picture*', (route) => {
      const { pathname, search } = new URL(route.request().url());
      return route.continue({ url: `${authOrigin}${pathname}${search}` });
    });
    await openAccount(page);

    await expect(page.getByText('No picture yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove picture' })).toHaveCount(0);

    await page.getByLabel('Profile picture').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: PNG,
    });
    await page.getByRole('button', { name: 'Upload picture' }).click();

    await expect(page.getByText('Picture set')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove picture' })).toBeVisible();
    const avatar = page.locator('img').and(page.getByRole('img', { name: alt }));
    await expect(avatar).toBeVisible();
    await expect
      .poll(() => avatar.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);

    // Slika preživljava osvežavanje.
    await page.reload();
    await expect(page.getByText('Picture set')).toBeVisible();

    await page.getByRole('button', { name: 'Remove picture' }).click();
    await expect(page.getByText('No picture yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove picture' })).toHaveCount(0);
    await expect(page.locator('img').and(page.getByRole('img', { name: alt }))).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Upload picture' })).toBeVisible();
  });
});
