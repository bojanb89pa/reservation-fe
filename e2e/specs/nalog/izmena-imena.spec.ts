// Izmena sopstvenog imena i prezimena na `/account` (reservation-agents#50):
// forma, validacija, i `PATCH /auth/users/me` (samo za sebe, bez email-a i rola, 401 bez tokena).

import { expect, test } from '../../fixtures/auth';
import { ApiClient, createActivatedUser } from '../../fixtures/api';

interface UserBody {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

test.describe('izmena imena na nalogu', () => {
  test.describe.configure({ timeout: 90_000 });

  test('korisnik menja ime i prezime, potvrda se prikazuje i izmena preživi osvežavanje', async ({
    page,
    loginAs,
  }) => {
    const user = await createActivatedUser({ firstName: 'Pocetno', lastName: 'Prezime' });
    await loginAs(user);
    await page.goto('/account');
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible();

    // Polja su popunjena trenutnim vrednostima.
    await expect(page.getByLabel('First name')).toHaveValue('Pocetno');
    await expect(page.getByLabel('Last name')).toHaveValue('Prezime');

    await page.getByLabel('First name').fill('Izmenjeno');
    await page.getByLabel('Last name').fill('Novoprezime');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Your name has been updated.')).toBeVisible();
    await expect(page.getByLabel('First name')).toHaveValue('Izmenjeno');

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible();
    await expect(page.getByLabel('First name')).toHaveValue('Izmenjeno');
    await expect(page.getByLabel('Last name')).toHaveValue('Novoprezime');
  });

  test('prazno ime ili prezime se odbija na formi i na API-ju', async ({ page, loginAs }) => {
    const user = await createActivatedUser({ firstName: 'Validno', lastName: 'Ime' });
    await loginAs(user);
    await page.goto('/account');
    await expect(page.getByLabel('First name')).toHaveValue('Validno');

    await page.getByLabel('First name').fill('   ');
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await page.getByLabel('First name').fill('Validno');
    await page.getByLabel('Last name').fill('');
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

    const api = await ApiClient.as(user);
    try {
      const blankFirst = await api.auth.patch('users/me', { data: { firstName: '  ', lastName: 'Ime' } });
      expect(blankFirst.status()).toBe(400);
      const blankLast = await api.auth.patch('users/me', { data: { firstName: 'Validno', lastName: '' } });
      expect(blankLast.status()).toBe(400);
      const missing = await api.auth.patch('users/me', { data: { firstName: 'Validno' } });
      expect(missing.status()).toBe(400);
    } finally {
      await api.dispose();
    }
  });

  test('PATCH /auth/users/me menja samo ime i prezime, ne email ni role ni tuđe podatke', async () => {
    const user = await createActivatedUser({ firstName: 'Moje', lastName: 'Ime' });
    const other = await createActivatedUser({ firstName: 'Tudje', lastName: 'Ime' });
    const api = await ApiClient.as(user);
    const otherApi = await ApiClient.as(other);
    try {
      const response = await api.auth.patch('users/me', {
        data: {
          firstName: 'Novo',
          lastName: 'Prezime',
          email: 'napadac@e2e.reserva.test',
          roles: ['ROLE_ADMIN'],
          id: 'tudji-id',
        },
      });
      expect(response.status()).toBe(200);
      const body = (await response.json()) as UserBody;
      expect(body.firstName).toBe('Novo');
      expect(body.lastName).toBe('Prezime');
      expect(body.email).toBe(user.email);
      expect(body.roles.some((r) => r.includes('ADMIN'))).toBe(false);

      // Drugi korisnik ostaje netaknut: njegov PATCH vraća njegove podatke.
      const otherResponse = await otherApi.auth.patch('users/me', {
        data: { firstName: 'Tudje', lastName: 'Ime' },
      });
      expect(otherResponse.status()).toBe(200);
      const otherBody = (await otherResponse.json()) as UserBody;
      expect(otherBody.email).toBe(other.email);
      expect(otherBody.id).not.toBe(body.id);
    } finally {
      await api.dispose();
      await otherApi.dispose();
    }
  });

  test('neprijavljen korisnik dobija 401 na PATCH /auth/users/me', async () => {
    const api = await ApiClient.anonymous();
    try {
      const response = await api.auth.patch('users/me', { data: { firstName: 'A', lastName: 'B' } });
      expect(response.status()).toBe(401);
    } finally {
      await api.dispose();
    }
  });
});
