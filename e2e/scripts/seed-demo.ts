// Demo seed za staging (tiket #94): 24 biznisa, demo nalozi i rezervacije,
// kroz postojeće auth-service/resource-service API-je. Idempotentan po
// prirodnom ključu (email naloga, naziv biznisa) — bezbedno se pokreće više
// puta, ništa ne briše, ne piše u bazu mimo API-ja.
//
// `yarn --cwd e2e seed:demo` (videti package.json — prvo kompajlira ovaj
// fajl preko tsc-a jer @playwright/test/ApiClient koristi parameter
// properties koje "gole" Node type-stripping ne podržava).
//
// Pokreće se ISKLJUČIVO ručno nad staging-om (nikad iz agenta ni iz CI-ja
// automatski nad staging-om) — CI ga pokreće samo nad efemernim e2e stackom,
// dvaput, da proveri idempotentnost (drugi put sa SEED_EXPECT_NOOP=1).

import { env } from '../env';
import { ApiClient } from '../fixtures/api';
import * as api from './seedApi';
import { assertStatus, fetchOwnerConsents, type ClientApplicationDto, type IntegrationBody } from '../fixtures/partners';

import accountsData from '../data/demo/accounts.json';
import businessesData from '../data/demo/businesses.json';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} nije postavljen`);
  }
  return value;
}

const SEED_ADMIN_EMAIL = requireEnv('SEED_ADMIN_EMAIL');
const SEED_ADMIN_PASSWORD = requireEnv('SEED_ADMIN_PASSWORD');
const DEMO_PASSWORD = requireEnv('DEMO_PASSWORD');
const EXPECT_NOOP = process.env['SEED_EXPECT_NOOP'] === '1';

const MAX_CONTENT_BYTES = 5 * 1024 * 1024;
const MAX_RESERVATIONS_PER_BUSINESS = 5;

// Demo partner sajt (epic #76): vrednosti iz ručnog koraka P0.
const DEMO_PARTNER_NAME = 'Demo partner - Beogradski Berberin';
const DEMO_PARTNER_BUSINESS = 'Beogradski Berberin';
const DEMO_PARTNER_LOCATION_ADDRESS = 'Cara Dušana 5'; // lokacija "Beogradski Berberin - Dorćol"
const DEMO_NO_CONSENT_BUSINESS = 'Kod Ane Frizerski Salon'; // biznis DRUGOG vlasnika
const GOOGLE_ISSUER = 'https://accounts.google.com';
const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_CLIENT_ID = '1007490113213-9c0jfm9074fejij8r3s6ea41t6g74eld.apps.googleusercontent.com';
const DEMO_SITE_ORIGIN = 'https://demo-business.bojanlab.com';
const DEMO_ALLOWED_SCOPES = ['reservation:create', 'reservation:read:own'];

interface OwnerAccount {
  email: string;
  firstName: string;
  lastName: string;
  city: string;
}
interface UserAccount {
  email: string;
  firstName: string;
  lastName: string;
}
interface AccountsFile {
  owners: OwnerAccount[];
  users: UserAccount[];
}

interface DemoLocation {
  name: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}
interface DemoService {
  name: string;
  minDuration: number;
  maxDuration: number;
  durationUnit: string;
  durationStep: number;
}
interface DemoResource {
  name: string;
  type: string;
  locationIndex: number;
}
interface DemoAvailability {
  resourceIndex: number;
  days: string[];
  startTime: string;
  endTime: string;
}
interface DemoReservation {
  userEmail: string;
  resourceIndex: number;
  serviceIndex: number;
  offsetDays: number;
  time: string;
}
interface DemoBusiness {
  name: string;
  ownerEmail: string;
  categoryKeywords: string[];
  locations: DemoLocation[];
  services: DemoService[];
  resources: DemoResource[];
  availability: DemoAvailability[];
  reservations: DemoReservation[];
}

const accounts: AccountsFile = accountsData;
const businesses: DemoBusiness[] = businessesData;

interface Counter {
  created: number;
  skipped: number;
}
const report = new Map<string, Counter>();
function bump(key: string, field: 'created' | 'skipped'): void {
  const counter = report.get(key) ?? { created: 0, skipped: 0 };
  counter[field] += 1;
  report.set(key, counter);
}
const gaps: string[] = [];

function estimateContentBytes(): number {
  return Buffer.byteLength(JSON.stringify(accounts)) + Buffer.byteLength(JSON.stringify(businesses));
}

function addDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}
/** Lokalni datum bez vremenske zone — isti oblik koji FE šalje kao `from`/`to` slot-ovima (BookingWidget.tsx `toDateStr`). */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function timeOf(isoLocal: string): string {
  return isoLocal.slice(11, 16);
}
function minutesDiff(a: string, b: string): number {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return Math.abs((ah ?? 0) * 60 + (am ?? 0) - ((bh ?? 0) * 60 + (bm ?? 0)));
}

async function demoClientFor(demoClients: Map<string, ApiClient>, email: string): Promise<ApiClient> {
  let client = demoClients.get(email);
  if (!client) {
    client = await ApiClient.as({ email, password: DEMO_PASSWORD });
    demoClients.set(email, client);
  }
  return client;
}

async function ensureAccounts(
  admin: ApiClient,
  demoClients: Map<string, ApiClient>,
): Promise<Map<string, string>> {
  const userIdByEmail = new Map<string, string>();
  const all: Array<OwnerAccount | UserAccount> = [...accounts.owners, ...accounts.users];
  for (const account of all) {
    let user = await api.findUserByEmail(admin, account.email);
    if (!user) {
      user = await api.createUserByAdmin(admin, {
        email: account.email,
        password: DEMO_PASSWORD,
        firstName: account.firstName,
        lastName: account.lastName,
      });
      bump('nalozi', 'created');
    } else {
      bump('nalozi', 'skipped');
    }
    if (user.status !== 'ACTIVE') {
      user = await api.activateUserByAdmin(admin, user.id);
      bump('nalozi-aktivacija', 'created');
    } else {
      bump('nalozi-aktivacija', 'skipped');
    }
    userIdByEmail.set(account.email, user.id);
  }
  // Odmah proveri da svaki demo nalog stvarno može da se uloguje (OAuth) —
  // greška ovde je jasnija nego kasnije, usred pravljenja rezervacije.
  for (const account of all) {
    await demoClientFor(demoClients, account.email);
  }
  return userIdByEmail;
}

function resolveCategoryId(categories: api.BusinessCategoryDto[], keywords: string[]): string | null {
  const lowered = categories.map((c) => ({ id: c.id, lower: c.name.toLowerCase() }));
  for (const keyword of keywords) {
    const match = lowered.find((c) => c.lower.includes(keyword));
    if (match) return match.id;
  }
  return null;
}

async function ensureLocations(
  ownerApi: ApiClient,
  businessId: string,
  planned: DemoLocation[],
): Promise<string[]> {
  const existing = await api.listLocations(ownerApi, businessId);
  const ids: string[] = [];
  for (const location of planned) {
    let match = existing.find((l) => l.addressLine1 === location.addressLine1);
    if (!match) {
      match = await api.createLocation(ownerApi, businessId, location);
      existing.push(match);
      bump('lokacije', 'created');
    } else {
      bump('lokacije', 'skipped');
    }
    if (!match.ownerConfirmed) {
      await api.confirmLocation(ownerApi, businessId, match.id);
    }
    ids.push(match.id);
  }
  return ids;
}

async function ensureServices(
  ownerApi: ApiClient,
  businessId: string,
  planned: DemoService[],
  locationIds: string[],
): Promise<string[]> {
  const existing = await api.listServices(ownerApi, businessId);
  const ids: string[] = [];
  for (const service of planned) {
    let match = existing.find((s) => s.name === service.name);
    if (!match) {
      match = await api.createService(ownerApi, businessId, service);
      existing.push(match);
      bump('usluge', 'created');
    } else {
      bump('usluge', 'skipped');
    }
    ids.push(match.id);
  }
  for (const locationId of locationIds) {
    const linked = await api.listLocationServiceIds(ownerApi, businessId, locationId);
    for (const serviceId of ids) {
      if (!linked.includes(serviceId)) {
        await api.addServiceToLocation(ownerApi, businessId, locationId, serviceId);
        bump('usluge-lokacije', 'created');
      } else {
        bump('usluge-lokacije', 'skipped');
      }
    }
  }
  return ids;
}

async function ensureResources(
  ownerApi: ApiClient,
  businessId: string,
  businessName: string,
  planned: DemoResource[],
  locationIds: string[],
): Promise<string[]> {
  const existing = await api.listResources(ownerApi, businessId);
  const ids: string[] = [];
  for (const resource of planned) {
    let match = existing.find((r) => r.name === resource.name && r.type === resource.type);
    if (!match) {
      match = await api.createResource(ownerApi, businessId, { name: resource.name, type: resource.type });
      existing.push(match);
      bump('resursi', 'created');
    } else {
      bump('resursi', 'skipped');
    }
    ids.push(match.id);

    const locationId = locationIds[resource.locationIndex];
    if (!locationId) {
      gaps.push(`${businessName}: resurs "${resource.name}" referencira nepostojeću lokaciju (index ${resource.locationIndex})`);
      continue;
    }
    const linked = await api.listLocationResourceIds(ownerApi, businessId, locationId);
    if (!linked.includes(match.id)) {
      await api.addResourceToLocation(ownerApi, businessId, locationId, match.id);
      bump('resursi-lokacije', 'created');
    } else {
      bump('resursi-lokacije', 'skipped');
    }
  }
  return ids;
}

async function ensureAvailability(
  ownerApi: ApiClient,
  planned: DemoAvailability[],
  resourceIds: string[],
): Promise<void> {
  for (const rule of planned) {
    const resourceId = resourceIds[rule.resourceIndex];
    if (!resourceId) continue;
    const existing = await api.listAvailabilityRules(ownerApi, resourceId);
    for (const day of rule.days) {
      const match = existing.find(
        (r) => r.dayOfWeek === day && r.startTime === rule.startTime && r.endTime === rule.endTime,
      );
      if (!match) {
        await api.createAvailabilityRule(ownerApi, resourceId, {
          dayOfWeek: day,
          startTime: rule.startTime,
          endTime: rule.endTime,
        });
        bump('radno-vreme', 'created');
      } else {
        bump('radno-vreme', 'skipped');
      }
    }
  }
}

async function ensureReservations(
  demoClients: Map<string, ApiClient>,
  businessId: string,
  businessName: string,
  planned: DemoReservation[],
  resourceIds: string[],
  serviceIds: string[],
): Promise<void> {
  if (planned.length === 0) return;
  const limit = Math.min(MAX_RESERVATIONS_PER_BUSINESS, planned.length);

  const involvedEmails = [...new Set(planned.map((r) => r.userEmail))];
  const existingByUser = new Map<string, api.ReservationDto[]>();
  let existingCount = 0;
  for (const email of involvedEmails) {
    const userApi = await demoClientFor(demoClients, email);
    const all = await api.listMyReservations(userApi);
    const forBusiness = all.filter(
      (r) => r.business?.id === businessId && r.status !== 'REJECTED' && r.status !== 'CANCELLED',
    );
    existingByUser.set(email, forBusiness);
    existingCount += forBusiness.length;
  }

  const today = new Date();
  for (const entry of planned) {
    if (existingCount >= limit) {
      bump('rezervacije', 'skipped');
      continue;
    }
    const resourceId = resourceIds[entry.resourceIndex];
    const serviceId = serviceIds[entry.serviceIndex];
    if (!resourceId || !serviceId) {
      gaps.push(`${businessName}: rezervacija za ${entry.userEmail} referencira nepostojeći resurs/uslugu`);
      continue;
    }

    const alreadyExists = (existingByUser.get(entry.userEmail) ?? []).some(
      (r) => r.resourceId === resourceId && r.serviceId === serviceId,
    );
    if (alreadyExists) {
      bump('rezervacije', 'skipped');
      continue;
    }

    const userApi = await demoClientFor(demoClients, entry.userEmail);
    const targetDate = toDateStr(addDays(today, entry.offsetDays));
    const slots = await api.fetchSlots(userApi, resourceId, serviceId, targetDate, targetDate);
    const available = slots.filter((s) => s.status === 'AVAILABLE');
    if (available.length === 0) {
      gaps.push(
        `${businessName}: nema slobodnih termina ${targetDate} za resurs ${resourceId} (rezervacija za ${entry.userEmail} preskočena)`,
      );
      continue;
    }
    let best = available[0]!;
    for (const slot of available) {
      if (minutesDiff(timeOf(slot.startTime), entry.time) < minutesDiff(timeOf(best.startTime), entry.time)) {
        best = slot;
      }
    }

    await api.createReservation(userApi, resourceId, {
      serviceId,
      startTime: best.startTime,
      endTime: best.endTime,
    });
    bump('rezervacije', 'created');
    existingCount += 1;
  }
}

async function seedBusiness(
  admin: ApiClient,
  demoClients: Map<string, ApiClient>,
  userIdByEmail: Map<string, string>,
  categories: api.BusinessCategoryDto[],
  business: DemoBusiness,
): Promise<SeededBusiness | null> {
  const ownerId = userIdByEmail.get(business.ownerEmail);
  if (!ownerId) {
    gaps.push(`${business.name}: vlasnik ${business.ownerEmail} nije pronađen među demo nalozima`);
    return null;
  }
  const ownerApi = await demoClientFor(demoClients, business.ownerEmail);

  const firstLocation = business.locations[0];
  if (!firstLocation) {
    gaps.push(`${business.name}: nema definisanu lokaciju u sadržaju, biznis je preskočen`);
    return null;
  }

  let dto = await api.findBusinessByName(admin, business.name);
  if (!dto) {
    dto = await api.createBusinessByAdmin(admin, { name: business.name, ownerId, location: firstLocation });
    bump('biznisi', 'created');
  } else {
    bump('biznisi', 'skipped');
  }
  const businessId = dto.id;

  const categoryId = resolveCategoryId(categories, business.categoryKeywords);
  if (categoryId) {
    if (dto.categoryId !== categoryId) {
      await api.setBusinessCategory(admin, businessId, categoryId);
      bump('kategorije', 'created');
    } else {
      bump('kategorije', 'skipped');
    }
  } else {
    gaps.push(
      `${business.name}: nijedna kategorija ne odgovara ključnim rečima [${business.categoryKeywords.join(', ')}]`,
    );
  }

  const locationIds = await ensureLocations(ownerApi, businessId, business.locations);
  const serviceIds = await ensureServices(ownerApi, businessId, business.services, locationIds);
  const resourceIds = await ensureResources(ownerApi, businessId, business.name, business.resources, locationIds);
  await ensureAvailability(ownerApi, business.availability, resourceIds);
  await ensureReservations(
    demoClients,
    businessId,
    business.name,
    business.reservations,
    resourceIds,
    serviceIds,
  );
  return { locationIds };
}

/** Lokacije jednog demo biznisa, istim redom kao u `businesses.json`. */
interface SeededBusiness {
  locationIds: string[];
}

function locationIdByAddress(planned: DemoBusiness, seeded: SeededBusiness, addressLine1: string): string {
  const index = planned.locations.findIndex((l) => l.addressLine1 === addressLine1);
  const id = index >= 0 ? seeded.locationIds[index] : undefined;
  if (!id) throw new Error(`${planned.name}: lokacija "${addressLine1}" nije pronađena u seed-u`);
  return id;
}

async function fetchIntegration(admin: ApiClient, clientApplicationId: string): Promise<IntegrationBody | null> {
  const response = await admin.auth.get(`admin/client-applications/${clientApplicationId}/integration`);
  if (response.status() === 404) return null;
  await assertStatus(response, 200, `GET /auth/admin/client-applications/${clientApplicationId}/integration`);
  return (await response.json()) as IntegrationBody;
}

/** Dopuni integraciju onim što demo sajt traži; postojeće stavke ostaju netaknute. Vraća true ako je upisano. */
async function ensureIntegration(admin: ApiClient, partner: ClientApplicationDto): Promise<boolean> {
  const current = await fetchIntegration(admin, partner.id);
  const issuers = [...(current?.trustedIssuers ?? [])];
  const origins = [...(current?.allowedOrigins ?? [])];
  const scopes = [...(current?.allowedScopes ?? [])];
  let changed = false;

  const google = issuers.find((i) => i.type === 'OIDC' && i.issuer === GOOGLE_ISSUER);
  if (!google) {
    issuers.push({ type: 'OIDC', issuer: GOOGLE_ISSUER, jwksUri: GOOGLE_JWKS_URI, audiences: [GOOGLE_CLIENT_ID] });
    changed = true;
  } else if (!google.audiences.includes(GOOGLE_CLIENT_ID)) {
    google.audiences = [...google.audiences, GOOGLE_CLIENT_ID];
    changed = true;
  }
  if (!origins.includes(DEMO_SITE_ORIGIN)) {
    origins.push(DEMO_SITE_ORIGIN);
    changed = true;
  }
  for (const scope of DEMO_ALLOWED_SCOPES) {
    if (!scopes.includes(scope)) {
      scopes.push(scope);
      changed = true;
    }
  }
  if (!changed) return false;

  const response = await admin.auth.put(`admin/client-applications/${partner.id}/integration`, {
    data: { trustedIssuers: issuers, allowedOrigins: origins, allowedScopes: scopes },
  });
  await assertStatus(response, 200, `PUT /auth/admin/client-applications/${partner.id}/integration`);
  return true;
}

interface DemoPartnerResult {
  clientId: string;
  noConsentLocationId: string;
}

/**
 * Client application demo partnera: scope = lokacija Dorćol + lokacija drugog biznisa (bez saglasnosti),
 * Google OIDC izdavalac, `allowed_origins` demo sajta i odobrena saglasnost za Dorćol (kroz API vlasnika).
 */
async function ensureDemoPartner(
  admin: ApiClient,
  demoClients: Map<string, ApiClient>,
  seeded: Map<string, SeededBusiness>,
): Promise<DemoPartnerResult> {
  const consentBusiness = businesses.find((b) => b.name === DEMO_PARTNER_BUSINESS);
  const otherBusiness = businesses.find((b) => b.name === DEMO_NO_CONSENT_BUSINESS);
  const consentSeeded = seeded.get(DEMO_PARTNER_BUSINESS);
  const otherSeeded = seeded.get(DEMO_NO_CONSENT_BUSINESS);
  if (!consentBusiness || !consentSeeded || !otherBusiness || !otherSeeded) {
    throw new Error('Demo partner: biznisi za scope nisu seed-ovani (videti nedostatke iznad)');
  }
  const consentLocationId = locationIdByAddress(consentBusiness, consentSeeded, DEMO_PARTNER_LOCATION_ADDRESS);
  const noConsentLocationId = otherSeeded.locationIds[0];
  if (!noConsentLocationId) throw new Error(`${DEMO_NO_CONSENT_BUSINESS}: nema lokaciju`);

  const listResponse = await admin.get('/admin/client-applications');
  await assertStatus(listResponse, 200, 'GET /admin/client-applications');
  const existing = ((await listResponse.json()) as ClientApplicationDto[]).find((a) => a.name === DEMO_PARTNER_NAME);

  let partner: ClientApplicationDto;
  if (existing) {
    partner = existing;
    bump('partner', 'skipped');
    // Scope se ne menja kroz API, pa neodgovarajući scope ne može da se "dovede u stanje".
    const ids = (partner.scope as { locationIds?: string[] }).locationIds ?? [];
    if (partner.scope.type !== 'LOCATION_LIST' || !ids.includes(consentLocationId) || !ids.includes(noConsentLocationId)) {
      throw new Error(
        `Partner "${DEMO_PARTNER_NAME}" (${partner.id}) već postoji sa drugačijim scope-om, a API ne dozvoljava izmenu scope-a — treba ga ručno ukloniti ili preimenovati.`,
      );
    }
  } else {
    const created = await admin.post('/admin/client-applications', {
      data: {
        name: DEMO_PARTNER_NAME,
        scope: { type: 'LOCATION_LIST', locationIds: [consentLocationId, noConsentLocationId] },
      },
    });
    await assertStatus(created, 200, 'POST /admin/client-applications');
    partner = (await created.json()) as ClientApplicationDto;
    bump('partner', 'created');
  }

  bump('partner-integracija', (await ensureIntegration(admin, partner)) ? 'created' : 'skipped');
  if (!partner.enabled) {
    gaps.push(`Partner "${DEMO_PARTNER_NAME}" (${partner.id}) je isključen — uključiti ga u admin panelu`);
  }

  // Saglasnost za Dorćol odobrava vlasnik tog biznisa, istim endpoint-om kao u aplikaciji.
  const ownerApi = await demoClientFor(demoClients, consentBusiness.ownerEmail);
  const consent = (await fetchOwnerConsents(ownerApi)).find(
    (c) => c.clientApplication.id === partner.id && c.location.id === consentLocationId,
  );
  if (!consent) {
    throw new Error(
      `Vlasnik ${consentBusiness.ownerEmail} ne vidi saglasnost za partnera ${partner.id} na lokaciji ${consentLocationId}`,
    );
  }
  if (consent.status === 'APPROVED') {
    bump('partner-saglasnost', 'skipped');
  } else {
    await assertStatus(
      await ownerApi.post(`/client-application-consents/${consent.id}/approve`),
      200,
      `POST /client-application-consents/${consent.id}/approve`,
    );
    bump('partner-saglasnost', 'created');
  }

  // Druga lokacija mora ostati bez saglasnosti; seed ništa ne opoziva, samo upozorava.
  const otherOwnerApi = await demoClientFor(demoClients, otherBusiness.ownerEmail);
  const otherConsent = (await fetchOwnerConsents(otherOwnerApi)).find(
    (c) => c.clientApplication.id === partner.id && c.location.id === noConsentLocationId,
  );
  if (otherConsent?.status === 'APPROVED') {
    gaps.push(
      `Partner ${partner.id} ima odobrenu saglasnost za lokaciju ${noConsentLocationId}, a treba da je nema — opozvati ručno`,
    );
  }

  return { clientId: partner.id, noConsentLocationId };
}

function reportCategoryGaps(categories: api.BusinessCategoryDto[]): void {
  const used = new Set<string>();
  for (const business of businesses) {
    const match = resolveCategoryId(categories, business.categoryKeywords);
    if (match) used.add(match);
  }
  for (const category of categories) {
    if (!used.has(category.id)) {
      gaps.push(`kategorija "${category.name}" nema nijedan demo biznis`);
    }
  }
}

function printReport(estimatedBytes: number, partner: DemoPartnerResult): void {
  console.log('\n=== Demo seed — rezime ===');
  const rows = [...report.entries()].map(([key, counts]) => ({
    tip: key,
    napravljeno: counts.created,
    preskočeno: counts.skipped,
  }));
  console.table(rows);

  if (gaps.length > 0) {
    console.log('\nNedostaci (nije upisano u bazu, potrebna ručna provera):');
    for (const gap of gaps) console.log(`  - ${gap}`);
  }

  console.log(
    `\nProcenjena veličina demo sadržaja: ${(estimatedBytes / 1024).toFixed(1)} KB (limit ${(
      MAX_CONTENT_BYTES /
      1024 /
      1024
    ).toFixed(0)} MB)`,
  );

  console.log('\nDemo nalozi (bez lozinki):');
  for (const owner of accounts.owners) console.log(`  vlasnik: ${owner.email} (${owner.city})`);
  for (const user of accounts.users) console.log(`  korisnik: ${user.email}`);

  console.log('\nDemo partner (upisati u repo varijable za deploy demo sajta):');
  console.log(`  DEMO_CLIENT_ID=${partner.clientId}`);
  console.log(`  DEMO_NO_CONSENT_LOCATION_ID=${partner.noConsentLocationId}`);
}

async function main(): Promise<void> {
  const estimatedBytes = estimateContentBytes();
  if (estimatedBytes > MAX_CONTENT_BYTES) {
    throw new Error(
      `Demo sadržaj (${estimatedBytes} B) prelazi limit od ${MAX_CONTENT_BYTES} B — seed se ne pokreće, ništa nije upisano.`,
    );
  }
  console.log(`Ciljni stack: baseUrl=${env.baseUrl} authUrl=${env.authUrl} apiUrl=${env.apiUrl}`);

  const admin = await ApiClient.as({ email: SEED_ADMIN_EMAIL, password: SEED_ADMIN_PASSWORD });
  const demoClients = new Map<string, ApiClient>();

  try {
    const userIdByEmail = await ensureAccounts(admin, demoClients);
    const categories = await api.fetchCategories(admin);
    reportCategoryGaps(categories);

    const seeded = new Map<string, SeededBusiness>();
    for (const business of businesses) {
      const result = await seedBusiness(admin, demoClients, userIdByEmail, categories, business);
      if (result) seeded.set(business.name, result);
    }

    const partner = await ensureDemoPartner(admin, demoClients, seeded);

    printReport(estimatedBytes, partner);

    const totalCreated = [...report.values()].reduce((sum, c) => sum + c.created, 0);
    if (EXPECT_NOOP && totalCreated > 0) {
      throw new Error(
        `SEED_EXPECT_NOOP=1, ali je seed napravio ${totalCreated} novih zapisa — nije idempotentan (videti tabelu iznad).`,
      );
    }
  } finally {
    await admin.dispose();
    for (const client of demoClients.values()) {
      await client.dispose();
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  });
