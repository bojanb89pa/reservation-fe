// epic:75 · Faza 2 / B: Reserva booking widget (widget.js loader, iframe /widget/, postMessage)
//
// Host stranica partnera se servira sa drugog origin-a (`page.route`, vidi fixtures/widget.ts),
// učitava pravi `widget.js` sa FE-a i rezerviše ID tokenom test OIDC izdavaoca (`oidc-issuer`).
//
// NIJE pokriveno:
// - `origin = CLIENT_APPLICATION` i `clientApplicationId` na rezervaciji: partnerski DTO ih ne
//   izlaže, a drugog javnog API-ja za čitanje tih polja nema. Vezivanje za `externalIdentityId`
//   je provereno posredno: rezervaciju vidi samo isti identitet (svoju 200, tuđu 404).
// - "vezan korisnik" (identitet povezan sa Reserva nalogom): vezivanje ide samo preko Google
//   `sub`, a Google se ne može simulirati (isto ograničenje kao u epic:67 specu).
// - Ponašanje browsera kad se iframe ugradi sa origin-a van `frame-ancestors` liste: proverena
//   je sama CSP vrednost zaglavlja.

import { request } from '@playwright/test';
import { expect, test } from '../fixtures/auth';
import {
  exchangeIdToken,
  partnerApi,
  signIdTokenWithUnknownKey,
  signOidcIdToken,
  uniqueSubject,
  uniqueAudience,
  assertStatus,
  type PartnerReservationDto,
} from '../fixtures/partners';
import {
  ATTACKER_ORIGIN,
  HOST_ORIGIN,
  RESERVA_ORIGIN,
  UNLISTED_HOST_ORIGIN,
  attackerFrame,
  openHostPage,
  selectServiceAndResource,
  selectSlot,
  setUpWidgetPartner,
  tearDownWidgetPartner,
  widgetFrame,
  widgetIframe,
  type HostWindow,
  type ReservationCreatedEvent,
} from '../fixtures/widget';
import { env } from '../env';

test.describe.configure({ timeout: 120_000 });

const SIGN_IN_NOTICE_EN = 'Sign in on the partner website to book a slot.';

const hostState = <T>(page: import('@playwright/test').Page, read: (w: HostWindow) => T) =>
  page.evaluate(`(${read.toString()})(window)`) as Promise<T>;

test.describe('epic:75 widget: prikaz, gost i rezervacija sa ID tokenom', () => {
  test('gost: widget prikazuje termine, umesto „Rezerviši“ poruka o prijavi; refreshIdentity otključava rezervaciju', async ({
    page,
  }) => {
    const setup = await setUpWidgetPartner();
    try {
      await openHostPage(page, { clientId: setup.partner.id, locationId: setup.locationId, idToken: null });
      const widget = widgetIframe(page);

      // Atributi iframe-a po ugovoru loadera.
      const iframe = page.locator('iframe[title="Reserva"]');
      await expect(iframe).toHaveAttribute(
        'sandbox',
        'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads',
      );
      expect(await iframe.getAttribute('sandbox')).not.toContain('allow-top-navigation');
      await expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin');

      await selectServiceAndResource(widget);
      await selectSlot(widget, setup.bookable);
      // Gost vidi aktivno „Rezerviši“; poruke o prijavi nema dok ne pokuša da potvrdi.
      await expect(widget.getByRole('button', { name: 'Confirm reservation' })).toBeEnabled();
      await expect(widget.getByTestId('booking-confirm-notice')).toHaveCount(0);

      // Partner bez `onSignInRequired`: widget ostaje u stanju „prijavite se na sajtu partnera“.
      await widget.getByRole('button', { name: 'Confirm reservation' }).click();
      const pending = widget.getByTestId('widget-sign-in-pending');
      await expect(pending).toBeVisible();
      await expect(pending).toContainText(SIGN_IN_NOTICE_EN);
      expect(await hostState(page, (w) => w.__created.length)).toBe(0);

      // Korisnik se prijavi na sajtu partnera: `refreshIdentity()` šalje ID token i widget
      // sam dovršava zapamćenu rezervaciju.
      const idToken = signOidcIdToken({ aud: setup.audience });
      await page.evaluate((token) => {
        const w = window as unknown as HostWindow;
        w.__idToken = token;
        return w.ReservaWidget.refreshIdentity();
      }, idToken);
      await expect(widget.getByTestId('widget-reservation-created')).toBeVisible();
      await expect.poll(() => hostState(page, (w) => w.__created.length)).toBe(1);
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });

  test('tema i jezik iz parametara: dark + sr', async ({ page }) => {
    const setup = await setUpWidgetPartner();
    try {
      await openHostPage(page, {
        clientId: setup.partner.id,
        locationId: setup.locationId,
        theme: 'dark',
        locale: 'sr',
        idToken: null,
      });
      const widget = widgetIframe(page);
      await expect(widget.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(widget.locator('html')).toHaveAttribute('lang', 'sr');
      await selectServiceAndResource(widget);
      await selectSlot(widget, setup.bookable);
      await expect(widget.getByRole('button', { name: 'Potvrdi rezervaciju' })).toBeEnabled();
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });

  test('gost sa ID tokenom test izdavaoca rezerviše; visina iframe-a prati sadržaj; poruka nosi samo dozvoljena polja; rezervacija pripada identitetu', async ({
    page,
  }) => {
    const setup = await setUpWidgetPartner();
    try {
      const subject = uniqueSubject();
      const email = `guest-${subject}@partner.e2e.reserva.test`;
      await openHostPage(page, {
        clientId: setup.partner.id,
        locationId: setup.locationId,
        idToken: signOidcIdToken({ aud: setup.audience, sub: subject, email }),
      });
      const widget = widgetIframe(page);
      const iframe = page.locator('iframe[title="Reserva"]');

      await selectServiceAndResource(widget);
      await selectSlot(widget, setup.bookable);
      // Sadržaj je porastao posle izbora: loader je primio `reserva:resize` i promenio visinu.
      await expect.poll(() => iframe.evaluate((el) => (el as HTMLElement).style.height)).not.toBe('420px');

      await widget.getByRole('button', { name: 'Confirm reservation' }).click();
      await expect(widget.getByTestId('widget-reservation-created')).toBeVisible();

      await expect.poll(() => hostState(page, (w) => w.__created.length)).toBe(1);
      const [created] = (await hostState(page, (w) => w.__created)) as [ReservationCreatedEvent];
      expect(Object.keys(created).sort()).toEqual(['endTime', 'id', 'locationName', 'startTime', 'status']);
      expect(created.startTime).toBe(setup.bookable.startTime);
      expect(created.endTime).toBe(setup.bookable.endTime);
      expect(created.locationName).toBe(setup.bookable.location.name);
      expect(created.status).toBe('PENDING_APPROVAL');
      expect(JSON.stringify(created)).not.toContain(email);
      expect(await hostState(page, (w) => w.__unavailable.length)).toBe(0);

      // Rezervacija je vezana za external identity: isti `sub` je vidi, drugi identitet ne.
      const own = await exchangeIdToken(setup.partner.id, signOidcIdToken({ aud: setup.audience, sub: subject }));
      expect(own.status, JSON.stringify(own.body)).toBe(200);
      const other = await exchangeIdToken(setup.partner.id, signOidcIdToken({ aud: setup.audience }));
      expect(other.status, JSON.stringify(other.body)).toBe(200);
      const ownApi = await partnerApi(own.body.access_token ?? '');
      const otherApi = await partnerApi(other.body.access_token ?? '');
      try {
        const seen = await ownApi.get(`/client-applications/reservations/${created.id}`);
        expect(seen.status()).toBe(200);
        const reservation = (await seen.json()) as PartnerReservationDto;
        expect(reservation.id).toBe(created.id);
        expect(reservation.resourceId).toBe(setup.bookable.resourceId);
        expect(reservation.startTime).toBe(setup.bookable.startTime);
        expect((await otherApi.get(`/client-applications/reservations/${created.id}`)).status()).toBe(404);
      } finally {
        await ownApi.dispose();
        await otherApi.dispose();
      }
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });
});

test.describe('epic:82 widget: gost bira termin pre prijave', () => {
  test('gost bira termin → „Rezerviši“ → sign-in-required → prijava → rezervacija se dovršava bez ponovnog izbora', async ({
    page,
  }) => {
    const setup = await setUpWidgetPartner();
    try {
      const subject = uniqueSubject();
      await openHostPage(page, {
        clientId: setup.partner.id,
        locationId: setup.locationId,
        idToken: null,
        signInIdToken: signOidcIdToken({ aud: setup.audience, sub: subject }),
      });
      const widget = widgetIframe(page);
      await selectServiceAndResource(widget);
      await selectSlot(widget, setup.bookable);
      await widget.getByRole('button', { name: 'Confirm reservation' }).click();

      // Partner je dobio `onSignInRequired` i prijavio korisnika; widget sam dovršava rezervaciju.
      await expect(widget.getByTestId('widget-reservation-created')).toBeVisible();
      expect(await hostState(page, (w) => w.__signInRequired)).toBe(1);
      await expect
        .poll(() => hostState(page, (w) => w.__raw.filter((m) => m.type === 'reserva:sign-in-required').length))
        .toBe(1);
      await expect.poll(() => hostState(page, (w) => w.__created.length)).toBe(1);
      const [created] = (await hostState(page, (w) => w.__created)) as [ReservationCreatedEvent];
      expect(created.startTime).toBe(setup.bookable.startTime);
      expect(created.endTime).toBe(setup.bookable.endTime);

      const own = await exchangeIdToken(setup.partner.id, signOidcIdToken({ aud: setup.audience, sub: subject }));
      expect(own.status, JSON.stringify(own.body)).toBe(200);
      const ownApi = await partnerApi(own.body.access_token ?? '');
      try {
        const seen = await ownApi.get(`/client-applications/reservations/${created.id}`);
        expect(seen.status()).toBe(200);
        const reservation = (await seen.json()) as PartnerReservationDto;
        expect(reservation.resourceId).toBe(setup.bookable.resourceId);
        expect(reservation.startTime).toBe(setup.bookable.startTime);
      } finally {
        await ownApi.dispose();
      }
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });

  test('odustajanje u stanju čekanja prijave vraća izbor termina bez rezervacije', async ({ page }) => {
    const setup = await setUpWidgetPartner();
    try {
      await openHostPage(page, { clientId: setup.partner.id, locationId: setup.locationId, idToken: null });
      const widget = widgetIframe(page);
      await selectServiceAndResource(widget);
      await selectSlot(widget, setup.bookable);
      await widget.getByRole('button', { name: 'Confirm reservation' }).click();
      await expect(widget.getByTestId('widget-sign-in-pending')).toBeVisible();

      await widget.getByRole('button', { name: 'Cancel' }).click();
      await expect(widget.getByTestId('widget-sign-in-pending')).toHaveCount(0);
      await expect(widget.getByRole('tablist').first()).toBeVisible();
      expect(await hostState(page, (w) => w.__created.length)).toBe(0);
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });
});

test.describe('epic:82 widget: watermark „by Reserva“', () => {
  const watermark = (widget: ReturnType<typeof widgetIframe>) => widget.getByTestId('widget-watermark');

  for (const theme of ['light', 'dark'] as const) {
    test(`watermark je vidljiv u svim stanjima (${theme}) i vodi na sajt u novom tabu`, async ({ page }) => {
      const setup = await setUpWidgetPartner();
      try {
        await openHostPage(page, { clientId: setup.partner.id, locationId: setup.locationId, theme, idToken: null });
        const widget = widgetIframe(page);
        const iframe = page.locator('iframe[title="Reserva"]');

        await expect(watermark(widget)).toBeVisible();
        await expect(watermark(widget)).toHaveAttribute('href', RESERVA_ORIGIN);
        await expect(watermark(widget)).toHaveAttribute('target', '_blank');
        await expect(watermark(widget)).toHaveAttribute('rel', /noopener/);
        await expect(watermark(widget)).toContainText('by Reserva');
        await expect(watermark(widget).locator('svg')).toBeVisible();
        await expect(widget.getByRole('link', { name: 'by Reserva (opens in a new tab)' })).toBeVisible();

        // Ulazi u visinu iframe-a: dno watermark-a je unutar iframe-a.
        const inside = async () => {
          const box = await watermark(widget).boundingBox();
          const frameBox = await iframe.boundingBox();
          return !!box && !!frameBox && box.y + box.height <= frameBox.y + frameBox.height + 1;
        };
        await expect.poll(inside).toBe(true);

        await selectServiceAndResource(widget);
        await selectSlot(widget, setup.bookable);
        await expect(watermark(widget)).toBeVisible();

        await widget.getByRole('button', { name: 'Confirm reservation' }).click();
        await expect(widget.getByTestId('widget-sign-in-pending')).toBeVisible();
        await expect(watermark(widget)).toBeVisible();
        await expect.poll(inside).toBe(true);
      } finally {
        await tearDownWidgetPartner(setup);
      }
    });
  }

  test('watermark je vidljiv i u stanju potvrde', async ({ page }) => {
    const setup = await setUpWidgetPartner();
    try {
      await openHostPage(page, {
        clientId: setup.partner.id,
        locationId: setup.locationId,
        idToken: signOidcIdToken({ aud: setup.audience }),
      });
      const widget = widgetIframe(page);
      await selectServiceAndResource(widget);
      await selectSlot(widget, setup.bookable);
      await widget.getByRole('button', { name: 'Confirm reservation' }).click();
      await expect(widget.getByTestId('widget-reservation-created')).toBeVisible();
      await expect(widget.getByTestId('widget-watermark')).toBeVisible();
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });

  test('watermark je vidljiv i u stanju greške', async ({ page }) => {
    const setup = await setUpWidgetPartner();
    try {
      await openHostPage(page, {
        clientId: setup.partner.id,
        locationId: setup.locationId,
        idToken: signOidcIdToken({ aud: uniqueAudience() }),
      });
      const widget = widgetIframe(page);
      await selectServiceAndResource(widget);
      await selectSlot(widget, setup.bookable);
      await widget.getByRole('button', { name: 'Confirm reservation' }).click();
      await expect(widget.getByTestId('widget-error')).toBeVisible();
      await expect(widget.getByTestId('widget-watermark')).toBeVisible();
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });

  test('watermark je vidljiv i u stanju unavailable', async ({ page }) => {
    const setup = await setUpWidgetPartner({ inScope: false });
    try {
      await openHostPage(page, { clientId: setup.partner.id, locationId: setup.locationId, idToken: null });
      const widget = widgetIframe(page);
      await expect(widget.getByTestId('widget-alert')).toBeVisible();
      await expect(widget.getByTestId('widget-watermark')).toBeVisible();
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });
});

test.describe('epic:75 widget: odbijeni ID tokeni', () => {
  const cases: { name: string; token: (audience: string) => string }[] = [
    { name: 'pogrešan aud', token: () => signOidcIdToken({ aud: uniqueAudience() }) },
    { name: 'istekao token', token: (aud) => signOidcIdToken({ aud, expiresInSeconds: -3600 }) },
    {
      name: 'nepoznat izdavalac',
      token: (aud) => signIdTokenWithUnknownKey({ iss: 'https://nepoznat.e2e.reserva.test', aud }),
    },
  ];

  for (const { name, token } of cases) {
    test(`${name}: rezervacija je odbijena, widget prikazuje grešku, partner ne dobija reservation-created`, async ({
      page,
    }) => {
      const setup = await setUpWidgetPartner();
      try {
        await openHostPage(page, {
          clientId: setup.partner.id,
          locationId: setup.locationId,
          idToken: token(setup.audience),
        });
        const widget = widgetIframe(page);
        await selectServiceAndResource(widget);
        await selectSlot(widget, setup.bookable);
        await widget.getByRole('button', { name: 'Confirm reservation' }).click();

        await expect(widget.getByTestId('widget-error')).toHaveText(
          'Your sign-in was rejected. Please sign in again on the partner website.',
        );
        await expect(widget.getByTestId('widget-reservation-created')).toHaveCount(0);
        expect(await hostState(page, (w) => w.__created.length)).toBe(0);
        expect(await hostState(page, (w) => w.__unavailable.length)).toBe(0);
      } finally {
        await tearDownWidgetPartner(setup);
      }
    });
  }
});

test.describe('epic:75 widget: nedostupnost → onUnavailable({ reason })', () => {
  test('lokacija van scope-a partnera: LOCATION_OUT_OF_SCOPE', async ({ page }) => {
    const setup = await setUpWidgetPartner({ inScope: false });
    try {
      await openHostPage(page, { clientId: setup.partner.id, locationId: setup.locationId, idToken: null });
      await expect(widgetIframe(page).getByTestId('widget-alert')).toHaveText(
        'Booking is not available for this location.',
      );
      await expect.poll(() => hostState(page, (w) => w.__unavailable)).toEqual([
        { reason: 'LOCATION_OUT_OF_SCOPE' },
      ]);
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });

  test('bez saglasnosti vlasnika lokacija nije u widget-config-u: LOCATION_OUT_OF_SCOPE', async ({ page }) => {
    const setup = await setUpWidgetPartner({ approveConsent: false });
    try {
      await openHostPage(page, { clientId: setup.partner.id, locationId: setup.locationId, idToken: null });
      await expect(widgetIframe(page).getByTestId('widget-alert')).toBeVisible();
      await expect.poll(() => hostState(page, (w) => w.__unavailable)).toEqual([
        { reason: 'LOCATION_OUT_OF_SCOPE' },
      ]);
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });

  test('saglasnost opozvana posle učitavanja widget-a: pokušaj rezervacije daje CONSENT_NOT_APPROVED', async ({
    page,
  }) => {
    const setup = await setUpWidgetPartner();
    try {
      await openHostPage(page, {
        clientId: setup.partner.id,
        locationId: setup.locationId,
        idToken: signOidcIdToken({ aud: setup.audience }),
      });
      const widget = widgetIframe(page);
      await selectServiceAndResource(widget);
      await selectSlot(widget, setup.bookable);

      await assertStatus(
        await setup.ownerApi.post(`/client-application-consents/${setup.consentId}/revoke`),
        200,
        'revoke consent',
      );
      await widget.getByRole('button', { name: 'Confirm reservation' }).click();

      await expect(widget.getByTestId('widget-alert')).toHaveText(
        'The location owner has not approved booking through this website.',
      );
      await expect.poll(() => hostState(page, (w) => w.__unavailable)).toEqual([
        { reason: 'CONSENT_NOT_APPROVED' },
      ]);
      expect(await hostState(page, (w) => w.__created.length)).toBe(0);
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });

  test('isključen partner: PARTNER_DISABLED', async ({ page }) => {
    const setup = await setUpWidgetPartner();
    try {
      await assertStatus(
        await setup.adminApi.patch(`/admin/client-applications/${setup.partner.id}`, { data: { enabled: false } }),
        200,
        'PATCH enabled=false',
      );
      await openHostPage(page, { clientId: setup.partner.id, locationId: setup.locationId, idToken: null });
      await expect(widgetIframe(page).getByTestId('widget-alert')).toHaveText(
        'Booking through this website is currently switched off.',
      );
      await expect.poll(() => hostState(page, (w) => w.__unavailable)).toEqual([{ reason: 'PARTNER_DISABLED' }]);
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });
});

test.describe('epic:75 widget: provera origin-a poruka', () => {
  test('host origin van allowedOrigins partnera: widget se ne prikazuje i ne šalje nijednu poruku', async ({
    page,
  }) => {
    const setup = await setUpWidgetPartner();
    try {
      // 127.0.0.1:5175 sme da ugradi /widget/ (CSP), ali partner dozvoljava samo localhost:5175.
      await openHostPage(page, {
        origin: UNLISTED_HOST_ORIGIN,
        clientId: setup.partner.id,
        locationId: setup.locationId,
        idToken: signOidcIdToken({ aud: setup.audience }),
      });
      const widget = widgetIframe(page);
      await expect(widget.getByTestId('widget-alert')).toHaveText(
        'This website is not allowed to show the booking widget.',
      );
      await expect(widget.getByRole('tablist')).toHaveCount(0);
      const raw = await hostState(page, (w) => w.__raw);
      expect(raw.filter((m) => m.origin === RESERVA_ORIGIN)).toEqual([]);
      expect(await hostState(page, (w) => w.__unavailable.length)).toBe(0);
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });

  test('loader ignoriše poruke sa tuđeg origin-a; iframe ignoriše identitet koji nije od roditelja', async ({
    page,
  }) => {
    const setup = await setUpWidgetPartner();
    try {
      await openHostPage(page, {
        clientId: setup.partner.id,
        locationId: setup.locationId,
        idToken: null,
        withAttacker: true,
      });
      const widget = widgetIframe(page);
      const iframe = page.locator('iframe[title="Reserva"]');
      await selectServiceAndResource(widget);
      await selectSlot(widget, setup.bookable);
      await widget.getByRole('button', { name: 'Confirm reservation' }).click();
      await expect(widget.getByTestId('widget-sign-in-pending')).toContainText(SIGN_IN_NOTICE_EN);

      // Evidencija poruka koje stižu u iframe, da znamo da je napadačeva obrađena.
      const inner = widgetFrame(page);
      await inner.evaluate(() => {
        const w = window as unknown as { __seen: string[] };
        w.__seen = [];
        window.addEventListener('message', (e) => w.__seen.push(e.origin));
      });

      const validToken = signOidcIdToken({ aud: setup.audience });
      await expect.poll(() => page.frames().some((f) => f.url().startsWith(ATTACKER_ORIGIN))).toBe(true);
      await attackerFrame(page).evaluate((token) => {
        // Napadač (sused-iframe) → loader na host stranici.
        parent.postMessage(
          {
            v: 1,
            type: 'reserva:reservation-created',
            reservation: { id: 'x', status: 'CONFIRMED', startTime: 'a', endTime: 'b', locationName: 'x' },
          },
          '*',
        );
        parent.postMessage({ v: 1, type: 'reserva:unavailable', reason: 'PARTNER_DISABLED' }, '*');
        parent.postMessage({ v: 1, type: 'reserva:resize', height: 5000 }, '*');
        // Napadač → widget iframe, sa ispravnim ID tokenom. Napadačev iframe je u HTML-u, a
        // widget iframe loader pravi kasnije, pa `frames[0]` je sam napadač: šalje se svim
        // ostalim frame-ovima roditelja.
        for (let i = 0; i < parent.frames.length; i++) {
          if (parent.frames[i] !== window) {
            parent.frames[i]!.postMessage({ v: 1, type: 'reserva:identity', idToken: token }, '*');
          }
        }
      }, validToken);

      await expect
        .poll(() => hostState(page, (w) => w.__raw.filter((m) => m.origin === 'http://localhost:5176').length))
        .toBe(3);
      await expect.poll(() => inner.evaluate(() => (window as unknown as { __seen: string[] }).__seen)).toContain(
        ATTACKER_ORIGIN,
      );

      // Ništa od toga nije stiglo do partnera niti promenilo widget.
      expect(await hostState(page, (w) => w.__created.length)).toBe(0);
      expect(await hostState(page, (w) => w.__unavailable.length)).toBe(0);
      expect(await iframe.evaluate((el) => (el as HTMLElement).style.height)).not.toBe('5000px');
      await expect(widget.getByTestId('widget-sign-in-pending')).toContainText(SIGN_IN_NOTICE_EN);
      expect(await hostState(page, (w) => w.__created.length)).toBe(0);
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });
});

test.describe('epic:75 zaglavlja: frame-ancestors', () => {
  test('/widget/ dozvoljava samo listu iz env-a; ostatak FE-a i widget.js su \'self\'', async () => {
    const http = await request.newContext();
    try {
      const csp = async (path: string) => (await http.get(`${env.baseUrl}${path}`)).headers()['content-security-policy'];

      const widgetCsp = await csp('/widget/');
      expect(widgetCsp).toMatch(/^frame-ancestors /);
      expect(widgetCsp).toContain('https://demo-business.bojanlab.com');
      expect(widgetCsp).toContain(HOST_ORIGIN);
      expect(widgetCsp).not.toContain("'self'");
      expect(widgetCsp).not.toContain('*');
      expect(widgetCsp).not.toContain(ATTACKER_ORIGIN);

      expect(await csp('/')).toBe("frame-ancestors 'self'");
      expect(await csp('/login')).toBe("frame-ancestors 'self'");
      expect(await csp('/widget.js')).toBe("frame-ancestors 'self'");
    } finally {
      await http.dispose();
    }
  });
});

const noScroll = (page: import('@playwright/test').Page) =>
  widgetFrame(page).evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollHeight <= doc.clientHeight && document.body.scrollHeight <= doc.clientHeight;
  });

test.describe('epic:84 widget: obavezna tema, setTheme, bez scroll bara', () => {
  test('iframe nema scroll u stanjima učitavanje, termini i potvrda', async ({ page }) => {
    const setup = await setUpWidgetPartner();
    try {
      await openHostPage(page, { clientId: setup.partner.id, locationId: setup.locationId, idToken: null });
      const widget = widgetIframe(page);
      // Učitavanje: iframe je tek prikačen.
      await expect.poll(() => noScroll(page)).toBe(true);

      await selectServiceAndResource(widget);
      await selectSlot(widget, setup.bookable);
      await expect(widget.getByRole('button', { name: 'Confirm reservation' })).toBeEnabled();
      await expect.poll(() => noScroll(page)).toBe(true);

      await widget.getByRole('button', { name: 'Confirm reservation' }).click();
      await expect(widget.getByTestId('widget-sign-in-pending')).toBeVisible();
      const idToken = signOidcIdToken({ aud: setup.audience });
      await page.evaluate((token) => {
        const w = window as unknown as HostWindow;
        w.__idToken = token;
        return w.ReservaWidget.refreshIdentity();
      }, idToken);
      await expect(widget.getByTestId('widget-reservation-created')).toBeVisible();
      await expect.poll(() => noScroll(page)).toBe(true);
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });

  test('mount bez teme ne crta widget i ispisuje grešku', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await openHostPage(page, { clientId: 'c', locationId: 'l', theme: null, idToken: null });
    await expect.poll(() => errors.some((e) => e.includes('theme'))).toBe(true);
    await expect(page.locator('iframe[title="Reserva"]')).toHaveCount(0);
  });

  test('setTheme menja temu bez reload-a i bez gubitka izabranog termina', async ({ page }) => {
    const setup = await setUpWidgetPartner();
    try {
      await openHostPage(page, { clientId: setup.partner.id, locationId: setup.locationId, idToken: null });
      const widget = widgetIframe(page);
      await expect(widget.locator('html')).toHaveAttribute('data-theme', 'light');
      await selectServiceAndResource(widget);
      await selectSlot(widget, setup.bookable);
      const confirm = widget.getByRole('button', { name: 'Confirm reservation' });
      await expect(confirm).toBeEnabled();

      await page.evaluate(() => (window as unknown as HostWindow).ReservaWidget.setTheme('dark'));
      await expect(widget.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(confirm).toBeEnabled();

      await page.evaluate(() => (window as unknown as HostWindow).ReservaWidget.setTheme('light'));
      await expect(widget.locator('html')).toHaveAttribute('data-theme', 'light');
      await expect(confirm).toBeEnabled();
    } finally {
      await tearDownWidgetPartner(setup);
    }
  });
});
