// Registracija popunjava email iz ?email= linka pozivnice (epic #118)
//
// Link iz mejla pozivnice ima oblik `<register-url>?email=<email>`. Polje ostaje izmenljivo;
// bez parametra ili sa nevažećim emailom stranica radi kao pre.

import { expect, test } from '../../fixtures/auth';

test.describe('registracija: email iz ?email= linka', () => {
  test('/register?email=a%40b.rs popunjava email polje, a polje ostaje izmenljivo', async ({ page }) => {
    await page.goto('/register?email=a%40b.rs');
    const email = page.getByLabel('Email');
    await expect(email).toHaveValue('a@b.rs');

    await email.fill('drugi@b.rs');
    await expect(email).toHaveValue('drugi@b.rs');
  });

  test('bez parametra email polje je prazno', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByLabel('Email')).toHaveValue('');
  });

  test('sa nevažećim emailom email polje je prazno', async ({ page }) => {
    await page.goto('/register?email=nije-email');
    await expect(page.getByLabel('Email')).toHaveValue('');
  });
});
