// epic:31 · Elementi liste korisnika nestaju pri skrolovanju (super admin)
//
// Kontrolni tiket je opisao da pri skrolovanju liste korisnika u
// dashboard-u (Korisnici) neki redovi postanu nevidljivi umesto da ostanu na
// mestu. Fix (#151/#152) je promenio `.tableWrap` CSS iz `overflow-x: auto` u
// `overflow: auto`. Test ispod ne proverava CSS pravilo direktno, nego
// ponašanje koje korisnik vidi: napravi dovoljno redova da lista ne stane u
// (namerno mali) viewport, skroluje do poslednjeg reda i nazad do prvog, i na
// oba mesta stvarno klikne red (ne samo `toBeVisible`, koje ne hvata
// klipovanje overflow-om nadređenog elementa) da dokaže da je red zaista
// isrenderovan i dostupan, ne samo prisutan u DOM-u van vidljive oblasti.
//
// Kontrolni tiket: https://github.com/bojanb89pa/reservation-agents/issues/31

import { expect, test } from '../fixtures/auth';
import { ApiClient, adminCredentials, uniqueEmail, uniqueName } from '../fixtures/api';

const USER_COUNT = 12;

test.describe('epic:31 prikaz liste korisnika (super admin)', () => {
  // Namerno mali viewport: lista mora da bude veća od vidljive oblasti da bi
  // skrolovanje uopšte bilo potrebno (kontrolni tiket: "ako je lista veća").
  test.use({ viewport: { width: 1280, height: 500 } });

  test('redovi liste korisnika ostaju dostupni pri skrolovanju do dna i nazad', async ({
    page,
    loginAs,
  }) => {
    const marker = uniqueName('Skrol').replace(/\s+/g, '');
    const rowName = (index: number) => `${marker}-${String(index).padStart(2, '0')}`;

    const adminApi = await ApiClient.as(adminCredentials());
    try {
      await Promise.all(
        Array.from({ length: USER_COUNT }, (_, i) =>
          adminApi.auth.post('users/admin/accounts', {
            data: {
              email: uniqueEmail(`skrol-${i}`),
              password: 'E2e-Passw0rd!',
              firstName: rowName(i),
              lastName: marker,
              roles: ['ROLE_USER'],
            },
          }),
        ),
      ).then((responses) => {
        responses.forEach((r, i) => {
          expect(r.ok(), `kreiranje korisnika ${rowName(i)}: HTTP ${r.status()}`).toBe(true);
        });
      });

      await loginAs(adminCredentials());
      await page.goto('/dashboard');
      await page.getByRole('link', { name: 'Users', exact: true }).click();
      await page.waitForURL(/\/dashboard\/users$/);

      await page.getByPlaceholder('Search by name or email…').fill(marker);

      const allRows = page.getByRole('row', { name: new RegExp(`${marker}-\\d{2}`) });
      await expect(allRows).toHaveCount(USER_COUNT);

      const firstRow = page.getByRole('row', { name: rowName(0) });
      const lastRow = page.getByRole('row', { name: rowName(USER_COUNT - 1) });

      // Prvi red je vrh liste — mora biti vidljiv bez ikakvog skrolovanja.
      await expect(firstRow).toBeVisible();

      // Skroluj do poslednjeg reda i dokaži da je stvarno dostupan za klik
      // (klik sam po sebi proverava da red nije klipovan/zaklonjen, za
      // razliku od `toBeVisible` koje to ne hvata).
      await lastRow.scrollIntoViewIfNeeded();
      await expect(lastRow).toBeVisible();
      await lastRow.getByRole('link', { name: rowName(USER_COUNT - 1) }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: `${rowName(USER_COUNT - 1)} ${marker}` }),
      ).toBeVisible();
      await page.goBack();
      await expect(allRows).toHaveCount(USER_COUNT);

      // Skroluj nazad na vrh — prvi red mora ostati isti red kao na početku,
      // ne nestati niti biti zamenjen praznim prostorom.
      await firstRow.scrollIntoViewIfNeeded();
      await expect(firstRow).toBeVisible();
      await firstRow.getByRole('link', { name: rowName(0) }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: `${rowName(0)} ${marker}` }),
      ).toBeVisible();
      await page.goBack();

      // Nijedan red nije nestao posle skrolovanja u oba pravca.
      await expect(allRows).toHaveCount(USER_COUNT);
    } finally {
      await adminApi.dispose();
    }
  });
});
