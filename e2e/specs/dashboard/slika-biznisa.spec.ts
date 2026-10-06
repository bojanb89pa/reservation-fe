// E2E-015 · Slika biznisa
//
// Vlasnik na `/dashboard/businesses/:id` (sekcija "Business image") šalje sliku,
// ona se vidi na javnom detalju (`/businesses/:id`, hero) i u listi (kartica na
// `/search`), a posle brisanja se vraća podrazumevani prikaz (placeholder sa
// inicijalima i gradijentom, bez <img>). Napomena: placeholder zavisi od naziva
// i id-a biznisa, ne od kategorije.
//
// Tip i veličina fajla proveravaju se u FE (`UploadFileUseCase`) pre slanja, pa
// se greška prikazuje u sekciji bez ijednog poziva ka BE. `setInputFiles`
// zaobilazi `accept` atribut inputa, kao što bi to uradio korisnik sa "All files".

import { deflateSync } from 'node:zlib';
import type { APIResponse, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';

interface BusinessDto {
  id: string;
  name: string;
}

interface PageResponseDto<T> {
  content: T[];
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

/** Validan PNG (ispravni CRC-ovi) veličine 8×8, jednobojan, da ga browser sigurno dekodira. */
function createPng(size = 8): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0x80)]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const PNG_1X1 = createPng();

const MAX_IMAGE_BYTES = 5_242_880;

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

// `createActivatedUser()` ne vraća id korisnika, pa se ownerId čita preko admin pretrage naloga.
async function fetchOwnerId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectOk(response, `GET /auth/users/admin/accounts?search=${email}`);
  const page = (await response.json()) as PageResponseDto<{ id: string; email: string }>;
  const match = page.content.find((u) => u.email === email);
  if (!match) {
    throw new Error(`korisnik ${email} nije pronađen u admin pretrazi (/auth/users/admin/accounts)`);
  }
  return match.id;
}

/** Aktivan biznis (admin kreacija je odmah aktivna) čiji je vlasnik novi nalog. */
async function createOwnedBusiness(): Promise<{
  owner: Awaited<ReturnType<typeof createActivatedUser>>;
  business: BusinessDto;
}> {
  const owner = await createActivatedUser();
  const adminApi = await ApiClient.as(adminCredentials());
  try {
    const ownerId = await fetchOwnerId(adminApi, owner.email);
    const created = await adminApi.post('/businesses/admin', {
      data: {
        name: uniqueName('E2E Slika'),
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
    return { owner, business: (await created.json()) as BusinessDto };
  } finally {
    await adminApi.dispose();
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function openDashboard(page: Page, businessId: string): Promise<void> {
  await page.goto(`/dashboard/businesses/${businessId}`);
  await expect(page.getByRole('heading', { name: 'Business image' })).toBeVisible();
}

async function uploadImage(page: Page): Promise<void> {
  await page.getByLabel('Business image (optional)').setInputFiles({
    name: 'slika.png',
    mimeType: 'image/png',
    buffer: PNG_1X1,
  });
  await page.getByRole('button', { name: 'Upload image' }).click();
}

async function expectImageLoaded(page: Page, alt: string): Promise<void> {
  const image = page.getByRole('img', { name: alt });
  await expect(image).toBeVisible();
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
}

test.describe('E2E-015 slika biznisa', () => {
  test.describe.configure({ timeout: 90_000 });

  test('posle upload-a slika se vidi na javnom detalju i u listi', async ({ page, loginAs }) => {
    const { owner, business } = await createOwnedBusiness();
    const alt = `Photo of ${business.name}`;

    await loginAs(owner);
    await openDashboard(page, business.id);
    await expect(page.getByText('No image yet')).toBeVisible();

    await uploadImage(page);
    await expect(page.getByText('Image set')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove image' })).toBeVisible();
    await expectImageLoaded(page, alt);

    // Javni detalj (hero).
    await page.goto(`/businesses/${business.id}`);
    await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible();
    await expectImageLoaded(page, alt);

    // Lista: kartica u rezultatima pretrage.
    await page.goto('/');
    await page.getByRole('textbox', { name: 'What' }).fill(business.name);
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForURL((url) => url.pathname === '/search');
    const card = page.getByRole('link', { name: new RegExp(escapeRegex(business.name)) });
    await expect(card).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    const cardImage = card.getByRole('img', { name: alt });
    await expect(cardImage).toBeVisible();
    await expect
      .poll(() => cardImage.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  });

  test('prevelika slika prikazuje grešku i ne postavlja sliku', async ({ page, loginAs }) => {
    const { owner, business } = await createOwnedBusiness();

    await loginAs(owner);
    await openDashboard(page, business.id);

    await page.getByLabel('Business image (optional)').setInputFiles({
      name: 'prevelika.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(MAX_IMAGE_BYTES + 1),
    });
    await page.getByRole('button', { name: 'Upload image' }).click();

    await expect(page.getByText('The image may be at most 5 MB.')).toBeVisible();
    await expect(page.getByText('No image yet')).toBeVisible();
    await expect(page.getByRole('img', { name: `Photo of ${business.name}` })).toHaveCount(0);
  });

  test('fajl pogrešnog tipa prikazuje grešku i ne postavlja sliku', async ({ page, loginAs }) => {
    const { owner, business } = await createOwnedBusiness();

    await loginAs(owner);
    await openDashboard(page, business.id);

    await page.getByLabel('Business image (optional)').setInputFiles({
      name: 'dokument.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('ovo nije slika'),
    });
    await page.getByRole('button', { name: 'Upload image' }).click();

    await expect(page.getByText('Only JPEG, PNG, WebP images are allowed.')).toBeVisible();
    await expect(page.getByText('No image yet')).toBeVisible();
    await expect(page.getByRole('img', { name: `Photo of ${business.name}` })).toHaveCount(0);
  });

  test('posle brisanja prikazuje se podrazumevani prikaz bez slike', async ({ page, loginAs }) => {
    const { owner, business } = await createOwnedBusiness();
    const alt = `Photo of ${business.name}`;

    await loginAs(owner);
    await openDashboard(page, business.id);
    await uploadImage(page);
    await expect(page.getByText('Image set')).toBeVisible();
    await expectImageLoaded(page, alt);

    await page.getByRole('button', { name: 'Remove image' }).click();
    await expect(page.getByText('No image yet')).toBeVisible();
    await expect(page.getByRole('img', { name: alt })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Upload image' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove image' })).toHaveCount(0);

    // Javni detalj: naslov je tu, a slike nema (placeholder umesto <img>).
    await page.goto(`/businesses/${business.id}`);
    await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible();
    await expect(page.getByRole('img', { name: alt })).toHaveCount(0);
  });
});
