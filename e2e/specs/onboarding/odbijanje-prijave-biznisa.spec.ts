// E2E-011 · Odbijanje prijave biznisa
//
// Scenario: admin odbija prijavljen biznis (dugme "Reject" na
// /dashboard/businesses/:id) → biznis nije javno vidljiv, a podnosilac na
// /business-onboarding vidi da prijava nije odobrena.
//
// Prijava ide preko POST /businesses/submit (isti endpoint kao forma), jer je
// Google Places u CI stack-u isključen — vidi E2E-010
// (prijava-biznisa-i-odobravanje.spec.ts).

import type { APIResponse } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';

interface BusinessDto {
  id: string;
  name: string;
  status: string;
}

async function expectStatus(response: APIResponse, expected: number, label: string): Promise<void> {
  expect(
    response.status(),
    `${label}: očekivan HTTP ${expected}, stiglo ${response.status()} ${await response.text()}`,
  ).toBe(expected);
}

async function submitBusiness(ownerApi: ApiClient, name: string): Promise<BusinessDto> {
  const submitted = await ownerApi.post('/businesses/submit', {
    data: {
      name,
      location: {
        name: uniqueName('Lokacija'),
        addressLine1: uniqueName('Ulica'),
        city: 'Novi Sad',
        postalCode: '21000',
        countryCode: 'RS',
        latitude: 45.2671,
        longitude: 19.8335,
      },
    },
  });
  await expectStatus(submitted, 200, 'POST /businesses/submit');
  const business = (await submitted.json()) as BusinessDto;
  expect(business.status).toBe('PENDING');
  return business;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('E2E-011 odbijanje prijave biznisa', () => {
  test('admin odbija biznis, on nije javno vidljiv, a podnosilac vidi da je odbijen', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const ownerApi = await ApiClient.as(owner);
    try {
      const business = await submitBusiness(ownerApi, uniqueName('E2E Odbijanje'));

      // Admin odbija kroz UI.
      await loginAs(adminCredentials());
      await page.goto(`/dashboard/businesses/${business.id}`);
      await expect(page.getByText('This business is pending approval.')).toBeVisible();
      const rejectResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/businesses/${business.id}/reject`) &&
          response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Reject' }).click();
      expect((await rejectResponse).status()).toBe(200);
      await expect(page.getByText('This business is pending approval.')).not.toBeVisible();

      // Status na listi za admina je REJECTED.
      await page.goto('/dashboard/businesses');
      await expect(page.getByRole('link').filter({ hasText: business.name })).toContainText(
        'REJECTED',
      );

      // Nije javno vidljiv u pretrazi (jedinstven sufiks iz uniqueName pripada samo ovom biznisu).
      const nameFragment = business.name.split(' ').pop() as string;
      await page.goto(`/search?q=${encodeURIComponent(nameFragment)}`);
      await expect(page.getByText(`No results found for "${nameFragment}".`)).toBeVisible({
        timeout: 30_000,
      });
      await expect(
        page.getByRole('link', { name: new RegExp(escapeRegex(business.name)) }),
      ).toHaveCount(0);

      // Podnosilac vidi da prijava nije odobrena. Admin sesija na auth-service-u
      // se briše, inače authorize preskače login formu.
      await page.context().clearCookies();
      await page.evaluate(() => localStorage.clear());
      await loginAs(owner);
      await page.goto('/business-onboarding');
      await expect(
        page.getByText('Your previous application was not approved. You can submit a new one.'),
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Application under review' })).toHaveCount(0);
    } finally {
      await ownerApi.dispose();
    }
  });
});
