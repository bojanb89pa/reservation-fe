// epic:36 · Lista svih korisnika (skrol, resize, layout shift, badge-evi, paginacija)
//
// Kontrolni tiket: https://github.com/bojanb89pa/reservation-agents/issues/36
//
// Pokriva: paginaciju (10/25/50 po strani, prethodna/sledeća), razmak između
// badge-eva uloga i dostupnost kolone akcija posle promene veličine prozora.

import { expect, test } from '../fixtures/auth';
import { ApiClient, adminCredentials, uniqueEmail, uniqueName } from '../fixtures/api';

const USER_COUNT = 12;

async function createUsers(
  adminApi: ApiClient,
  marker: string,
  count: number,
  roles: string[],
): Promise<(index: number) => string> {
  const rowName = (index: number) => `${marker}-${String(index).padStart(2, '0')}`;
  const responses = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      adminApi.auth.post('users/admin/accounts', {
        data: {
          email: uniqueEmail(`lista-${i}`),
          password: 'E2e-Passw0rd!',
          firstName: rowName(i),
          lastName: marker,
          roles,
        },
      }),
    ),
  );
  responses.forEach((r, i) => {
    expect(r.ok(), `kreiranje korisnika ${rowName(i)}: HTTP ${r.status()}`).toBe(true);
  });
  return rowName;
}

test.describe('epic:36 lista svih korisnika (super admin)', () => {
  test('paginacija liste korisnika: 10 po strani, sledeća/prethodna i izbor broja stavki', async ({
    page,
    loginAs,
  }) => {
    const marker = uniqueName('Pagin').replace(/\s+/g, '');
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      await createUsers(adminApi, marker, USER_COUNT, ['ROLE_USER']);

      await loginAs(adminCredentials());
      await page.goto('/dashboard');
      await page.getByRole('link', { name: 'Users', exact: true }).click();
      await page.waitForURL(/\/dashboard\/users$/);
      await page.getByPlaceholder('Search by name or email…').fill(marker);

      const rows = page.getByRole('row', { name: new RegExp(`${marker}-\\d{2}`) });
      const prev = page.getByRole('button', { name: /Previous/ });
      const next = page.getByRole('button', { name: /Next/ });

      // Podrazumevano 10 po strani: prva strana ima 10, druga 2.
      await expect(page.getByText('Page 1 of 2')).toBeVisible();
      await expect(rows).toHaveCount(10);
      await expect(prev).toBeDisabled();
      await expect(next).toBeEnabled();

      await next.click();
      await expect(page.getByText('Page 2 of 2')).toBeVisible();
      await expect(rows).toHaveCount(USER_COUNT - 10);
      await expect(next).toBeDisabled();
      await expect(prev).toBeEnabled();

      await prev.click();
      await expect(page.getByText('Page 1 of 2')).toBeVisible();
      await expect(rows).toHaveCount(10);

      // Izbor broja stavki po strani vraća na prvu stranu i prikazuje sve.
      await page.getByLabel('Per page').selectOption('25');
      await expect(page.getByText('Page 1 of 1')).toBeVisible();
      await expect(rows).toHaveCount(USER_COUNT);
      await expect(next).toBeDisabled();

      await page.getByLabel('Per page').selectOption('50');
      await expect(rows).toHaveCount(USER_COUNT);
    } finally {
      await adminApi.dispose();
    }
  });

  test('badge-evi uloga se ne preklapaju, a akcije ostaju dostupne posle promene veličine prozora', async ({
    page,
    loginAs,
  }) => {
    const marker = uniqueName('Badge').replace(/\s+/g, '');
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const rowName = await createUsers(adminApi, marker, 1, ['ROLE_USER', 'ROLE_ADMIN']);

      await loginAs(adminCredentials());
      await page.goto('/dashboard');
      await page.getByRole('link', { name: 'Users', exact: true }).click();
      await page.waitForURL(/\/dashboard\/users$/);
      await page.getByPlaceholder('Search by name or email…').fill(marker);

      const row = page.getByRole('row', { name: rowName(0) });
      await expect(row).toHaveCount(1);

      const userBadge = row.getByText('User', { exact: true });
      const adminBadge = row.getByText('Admin', { exact: true });
      await expect(userBadge).toBeVisible();
      await expect(adminBadge).toBeVisible();

      const boxesOverlap = async () => {
        const a = await userBadge.boundingBox();
        const b = await adminBadge.boundingBox();
        if (!a || !b) return true;
        return !(
          a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y
        );
      };

      for (const size of [
        { width: 1280, height: 800 },
        { width: 900, height: 600 },
        { width: 600, height: 500 },
        { width: 1280, height: 800 },
      ]) {
        await page.setViewportSize(size);
        await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
        await expect(page.getByPlaceholder('Search by name or email…')).toBeVisible();
        await expect(userBadge).toBeVisible();
        await expect(adminBadge).toBeVisible();
        expect(
          await boxesOverlap(),
          `badge-evi se preklapaju na ${size.width}x${size.height}`,
        ).toBe(false);

        // Akcije ostaju u istom redu i dostupne (ne "lebde" van tabele).
        const edit = row.getByRole('button', { name: 'Edit', exact: true });
        await edit.scrollIntoViewIfNeeded();
        await expect(edit).toBeVisible();
        await expect(row.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();
      }
    } finally {
      await adminApi.dispose();
    }
  });
});
