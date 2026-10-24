import { expect, type FrameLocator, type Page } from '@playwright/test';
import { env } from '../env';
import { ApiClient, adminCredentials, createActivatedUser } from './api';
import {
  approveConsent,
  createBookableLocation,
  createBusinessWithLocation,
  fetchUserId,
  oidcIntegrationBody,
  registerPartner,
  saveIntegration,
  uniqueAudience,
  type BookableLocation,
  type ClientApplicationDto,
} from './partners';

// ---------------------------------------------------------------------------
// Booking widget (`/widget.js` + `/widget/`) — testna host stranica na drugom origin-u
//
// Host stranice nema ni na jednom serveru: `page.route` je servira sa "lažnog" origin-a,
// dok se `widget.js` i iframe učitavaju sa pravog FE-a (`env.baseUrl`). Origin-i su iz
// podrazumevane `WIDGET_FRAME_ANCESTORS` liste (vite preview / nginx), pa CSP dozvoljava
// ugrađivanje samo njima.
// ---------------------------------------------------------------------------

/** Origin host stranice partnera: na `frame-ancestors` listi i u `allowedOrigins` partnera. */
export const HOST_ORIGIN = 'http://localhost:5175';
/** Na `frame-ancestors` listi, ali NIJE u `allowedOrigins` partnera. */
export const UNLISTED_HOST_ORIGIN = 'http://127.0.0.1:5175';
/** Napadač: ni na jednoj listi; ugrađen kao sused-iframe na host stranici. */
export const ATTACKER_ORIGIN = 'http://localhost:5176';

export const RESERVA_ORIGIN = new URL(env.baseUrl).origin;

export interface HostPageOptions {
  clientId: string;
  locationId: string;
  /** Origin sa kog se servira host stranica (podrazumevano `HOST_ORIGIN`). */
  origin?: string;
  /** Tema widget-a (podrazumevano 'light'); `null` = mount bez teme (loader ne sme da crta). */
  theme?: 'light' | 'dark' | null;
  locale?: 'sr' | 'en';
  /** Početni ID token koji vraća `getIdentityToken`; `null` = gost. */
  idToken?: string | null;
  /**
   * Ako je zadat, host registruje `onSignInRequired`: broji poziv (`__signInRequired`), postavlja
   * ovaj ID token i zove `refreshIdentity()` (kao partner posle prijave). Bez njega callback ne postoji.
   */
  signInIdToken?: string;
  /** Dodaje iframe napadača (`ATTACKER_ORIGIN`) posle widget-a. */
  withAttacker?: boolean;
}

export interface ReservationCreatedEvent {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  locationName: string | null;
}

export interface HostWindow {
  __idToken: string | null;
  __created: ReservationCreatedEvent[];
  __unavailable: { reason: string }[];
  __signInRequired: number;
  __raw: { origin: string; type: unknown }[];
  ReservaWidget: {
    refreshIdentity(selector?: string): Promise<void>;
    setTheme(theme: 'light' | 'dark', selector?: string): void;
  };
}

function hostHtml(options: HostPageOptions): string {
  const config = JSON.stringify({
    clientId: options.clientId,
    locationId: options.locationId,
    theme: options.theme === null ? undefined : (options.theme ?? 'light'),
    locale: options.locale ?? 'en',
    idToken: options.idToken ?? null,
    signInIdToken: options.signInIdToken ?? null,
  }).replace(/</g, '\\u003c');
  // Snippet iz plana (queue + async script), plus evidencija događaja za asercije.
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>E2E partner host</title></head>
<body>
  <div id="reserva-widget"></div>
  ${options.withAttacker ? `<iframe id="attacker" title="attacker" src="${ATTACKER_ORIGIN}/attacker.html" width="10" height="10"></iframe>` : ''}
  <script>
    var cfg = ${config};
    window.__idToken = cfg.idToken;
    window.__created = [];
    window.__unavailable = [];
    window.__signInRequired = 0;
    window.__raw = [];
    window.addEventListener('message', function (e) {
      window.__raw.push({ origin: e.origin, type: e.data && e.data.type });
    });
    window.ReservaWidget = window.ReservaWidget || [];
    var mountOptions = {
      clientId: cfg.clientId,
      locationId: cfg.locationId,
      theme: cfg.theme,
      locale: cfg.locale,
      getIdentityToken: function () { return window.__idToken; },
      onReservationCreated: function (r) { window.__created.push(r); },
      onUnavailable: function (u) { window.__unavailable.push(u); }
    };
    if (cfg.signInIdToken) {
      mountOptions.onSignInRequired = function () {
        window.__signInRequired++;
        window.__idToken = cfg.signInIdToken;
        window.ReservaWidget.refreshIdentity();
      };
    }
    window.ReservaWidget.push(['mount', '#reserva-widget', mountOptions]);
  </script>
  <script async src="${env.baseUrl}/widget.js"></script>
</body></html>`;
}

/** Servira host stranicu (i stranicu napadača) sa drugog origin-a i otvara je. */
export async function openHostPage(page: Page, options: HostPageOptions): Promise<void> {
  const withoutIframe = options.theme === null;
  const origin = options.origin ?? HOST_ORIGIN;
  await page.route(`${origin}/**`, (route) =>
    new URL(route.request().url()).pathname === '/'
      ? route.fulfill({ contentType: 'text/html', body: hostHtml(options) })
      : route.fulfill({ status: 404, body: '' }),
  );
  await page.route(`${ATTACKER_ORIGIN}/**`, (route) =>
    new URL(route.request().url()).pathname === '/attacker.html'
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>attacker</title>' })
      : route.fulfill({ status: 404, body: '' }),
  );

  // Dijagnostika: ako loader ne napravi iframe, CI log kaže zašto (status widget.js, greške u konzoli).
  const diagnostics: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') diagnostics.push(`console.${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => diagnostics.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => diagnostics.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`));
  page.on('response', (r) => {
    if (r.url().includes('/widget.js') || r.url().includes('/widget/'))
      diagnostics.push(`response: ${r.status()} ${r.url()} ${r.headers()['content-type'] ?? ''}`);
  });

  await page.goto(`${origin}/`);
  if (withoutIframe) return; // mount bez teme: iframe se ne pravi, pa nema šta da se čeka
  try {
    await page.locator('iframe[title="Reserva"]').waitFor({ state: 'attached', timeout: 15_000 });
  } catch {
    throw new Error(`loader nije napravio iframe na ${origin}:\n${diagnostics.join('\n') || '(bez dijagnostike)'}`);
  }
}

export function widgetIframe(page: Page): FrameLocator {
  return page.frameLocator('iframe[title="Reserva"]');
}

export function widgetFrame(page: Page) {
  const frame = page.frames().find((f) => f.url().startsWith(`${RESERVA_ORIGIN}/widget/`));
  if (!frame) throw new Error('widget iframe nije učitan');
  return frame;
}

export function attackerFrame(page: Page) {
  const frame = page.frames().find((f) => f.url().startsWith(ATTACKER_ORIGIN));
  if (!frame) throw new Error('attacker iframe nije učitan');
  return frame;
}

/** Bira jedinu uslugu i jedini resurs lokacije (tablist 0 = usluge, 1 = resursi). */
export async function selectServiceAndResource(frame: FrameLocator): Promise<void> {
  const lists = frame.getByRole('tablist');
  await lists.nth(0).getByRole('tab').first().click();
  await lists.nth(1).getByRole('tab').first().click();
}

/** Bira dan i termin (08:00) iz `BookableLocation`; widget počinje u tekućem mesecu. */
export async function selectSlot(frame: FrameLocator, bookable: BookableLocation): Promise<void> {
  const [datePart] = bookable.startTime.split('T') as [string];
  const [year, month, day] = datePart.split('-').map(Number) as [number, number, number];
  const today = new Date();
  const monthsAhead = (year - today.getFullYear()) * 12 + (month - 1 - today.getMonth());
  for (let i = 0; i < monthsAhead; i++) {
    await frame.getByRole('button', { name: 'Next month' }).click();
  }
  const dayButton = frame.getByRole('button', { name: String(day), exact: true });
  await expect(dayButton).toBeEnabled({ timeout: 30_000 });
  await dayButton.click();
  await frame.getByRole('button', { name: '08:00', exact: true }).click();
}

export interface WidgetPartnerSetup {
  adminApi: ApiClient;
  ownerApi: ApiClient;
  partner: ClientApplicationDto;
  audience: string;
  bookable: BookableLocation;
  /** `locationId` koji ide u widget (isti kao `bookable.location.id`). */
  locationId: string;
  consentId: string | null;
}

export interface WidgetPartnerOptions {
  /** Vlasnik odobrava saglasnost (podrazumevano da). */
  approveConsent?: boolean;
  /** Lokacija je u opsegu partnera (podrazumevano da). */
  inScope?: boolean;
  allowedOrigins?: string[];
}

/** Biznis + rezervabilan resurs + partner koji veruje test izdavaocu i ima widget konfiguraciju. */
export async function setUpWidgetPartner(options: WidgetPartnerOptions = {}): Promise<WidgetPartnerSetup> {
  const adminApi = await ApiClient.as(adminCredentials());
  const owner = await createActivatedUser();
  const ownerApi = await ApiClient.as(owner);
  const ownerId = await fetchUserId(adminApi, owner.email);
  const bookable = await createBookableLocation(adminApi, ownerId);
  const scopeLocationId =
    options.inScope === false
      ? (await createBusinessWithLocation(adminApi, ownerId, 'E2E Widget drugi biznis')).location.id
      : bookable.location.id;
  const partner = await registerPartner(adminApi, [scopeLocationId], 'E2E Widget partner');
  const audience = uniqueAudience();
  await saveIntegration(
    adminApi,
    partner.id,
    oidcIntegrationBody(audience, { allowedOrigins: options.allowedOrigins ?? [HOST_ORIGIN] }),
  );
  const consentId =
    options.approveConsent === false || options.inScope === false
      ? null
      : (await approveConsent(ownerApi, partner.id)).id;
  return { adminApi, ownerApi, partner, audience, bookable, locationId: bookable.location.id, consentId };
}

export async function tearDownWidgetPartner(setup: WidgetPartnerSetup): Promise<void> {
  await setup.ownerApi.dispose();
  await setup.adminApi.dispose();
}
