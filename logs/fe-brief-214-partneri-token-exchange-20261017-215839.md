# FE brief — #214 Partneri sa sopstvenim loginom: token exchange, saglasnosti, widget-config

BE tiket: #218 (api sloj, epic #67). Dva servisa:
- **auth-service**: base URL `${AUTH_BASE}` = `http://localhost:8081/auth`
- **resource-service**: base URL `${API_BASE}` = `http://localhost:8080`

Reserva korisnički endpoint-i traže `Authorization: Bearer <Reserva user token>`. Partnerski endpoint-i traže **partnerski** token dobijen token exchange-om (vidi 1). Partnerski token **ne može** da se koristi ni na jednom Reserva korisničkom endpoint-u (403).

Greške: resource-service vraća `{ "message": string, "code": string | null }`, auth-service `{ "message": string }`. `/oauth2/token` vraća OAuth2 grešku `{ "error": string, "error_description"?: string }`.

---

## 1. Token exchange (auth-service) — `POST ${AUTH_BASE}/oauth2/token`

Javni klijent: samo `client_id` (javni ID klijentske aplikacije), **bez** secret-a i bez PKCE. CORS je dozvoljen sa Reserva web origin-a (budući widget iframe).

Request (`application/x-www-form-urlencoded`):

| param | vrednost |
|---|---|
| `grant_type` | `urn:ietf:params:oauth:grant-type:token-exchange` |
| `client_id` | javni ID klijentske aplikacije (UUID) |
| `subject_token` | OIDC ID token korisnika partnera |
| `subject_token_type` | `urn:ietf:params:oauth:token-type:id_token` |
| `scope` | opciono, razdvojeno razmakom; izostavljeno = svi dozvoljeni scope-ovi partnera |

Response 200:
```ts
interface TokenExchangeResponse {
  access_token: string;          // JWT, traje 10 min, aud = resource-service
  token_type: "Bearer";
  expires_in: number;            // ~600
  scope?: string;                // presek traženog i dozvoljenog, razdvojeno razmakom
  issued_token_type: "urn:ietf:params:oauth:token-type:access_token";
  // nema refresh_token-a
}
```
Claim-ovi u tokenu: `sub` = `externalIdentityId`, `clientApplicationId`, `externalIdentityId`, `linkedUserId` (samo ako je povezan Reserva nalog), `guestEmail`, `guestEmailVerified`, `scope` (niz).

Greške:
| HTTP | `error` | kada |
|---|---|---|
| 400 | `invalid_request` | nedostaje `subject_token` ili `subject_token_type` nije id_token |
| 400 | `invalid_grant` | loš potpis, istekao token, pogrešan `aud`, nepoznat `iss` / izdavalac drugog partnera, nema email-a (`error_description` = ključ greške, npr. `error.external_id_token.audience_mismatch`) |
| 400 | `invalid_scope` | nijedan traženi scope nije dozvoljen partneru |
| 401 | `invalid_client` | `client_id` nije partner, partner je isključen ili nema integracionu konfiguraciju |

## 2. Partnerske rezervacije (resource-service) — partnerski Bearer token

| metoda | putanja | scope | opis |
|---|---|---|---|
| POST | `/client-applications/reservations` | `reservation:create` | kreira rezervaciju za korisnika partnera |
| GET | `/client-applications/reservations` | `reservation:read:own` | sopstvene rezervacije (isti partner **i** isti external identity) |
| GET | `/client-applications/reservations/{id}` | `reservation:read:own` | jedna sopstvena; tuđa i nepostojeća daju isti **404** |

```ts
interface CreateReservationByClientApplicationRequest {
  resourceId: string; locationId: string; serviceId: string;
  startTime: string; endTime: string;   // LocalDateTime, "2026-11-01T10:00:00"
}
interface ReservationResponse {
  id: string; userId: string | null; resourceId: string; serviceId: string;
  startTime: string; endTime: string; status: string;
  service: { id: string; name: string; minDuration: number; maxDuration: number; durationUnit: string; durationStep: number } | null;
  resource: { id: string; name: string; type: string } | null;
  business: { id: string; name: string } | null;
}
```
Greške POST: 403 (fali scope), 404 (resurs/lokacija/usluga/partner), 409 `code=RESERVATION_SLOT_TAKEN`, 422 `code=CLIENT_APPLICATION_LOCATION_CONSENT_NOT_APPROVED` (vlasnik lokacije nije odobrio partnera ili je opozvao), 422 (partner isključen, lokacija van scope-a, loše trajanje).

## 3. Widget config (resource-service, javno) — `GET ${API_BASE}/client-applications/{id}/widget-config`

Bez autentikacije, bez tajni. 404 ako partner ne postoji.
```ts
interface ClientApplicationWidgetConfigResponse {
  clientApplicationId: string;
  enabled: boolean;
  locations: { locationId: string; locationName: string | null; businessId: string; businessName: string }[]; // samo scope ∩ APPROVED
}
```
`allowedOrigins` widget čita sa auth-service javnog endpoint-a (4).

## 4. Javna integracija partnera (auth-service, javno) — `GET ${AUTH_BASE}/client-applications/{id}/integration`

Bez autentikacije, CORS sa Reserva origin-a. Bez izdavalaca. 404 ako konfiguracija nije sačuvana.
```ts
interface PublicClientApplicationIntegrationResponse {
  clientApplicationId: string;
  allowedOrigins: string[];   // npr. "https://partner.example.com"
  allowedScopes: string[];    // "reservation:create" | "reservation:read:own"
}
```
Koristi se i na stranici vlasnika „Partneri“ za domen (origin-i) i „šta sme“ (scope-ovi), jer to resource-service nema.

## 5. Admin (ROLE_ADMIN)

### resource-service
| metoda | putanja | response |
|---|---|---|
| POST | `/admin/client-applications` | `ClientApplicationResponse` (postojeći; scope sada podržava i `LOCATION_LIST`) |
| GET | `/admin/client-applications` | `ClientApplicationResponse[]` |
| GET | `/admin/client-applications/{id}` | `ClientApplicationDetailResponse` (404 ako ne postoji) |

```ts
type ClientApplicationScope =
  | { type: "SINGLE_LOCATION"; locationId: string }
  | { type: "MULTIPLE_LOCATIONS"; businessId: string; locationIds: string[] }
  | { type: "LOCATION_LIST"; locationIds: string[] }      // NOVO: lokacije različitih biznisa
  | { type: "CATEGORY"; categoryId: string };

interface CreateClientApplicationRequest { name: string; scope: ClientApplicationScope }
interface ClientApplicationResponse { id: string; name: string; scope: ClientApplicationScope; enabled: boolean }

type ConsentStatus = "PENDING" | "APPROVED" | "REVOKED";
interface ClientApplicationLocationConsentResponse {
  id: string; clientApplicationId: string; locationId: string; status: ConsentStatus;
  decidedByUserId: string | null; decidedAt: string | null; createdAt: string;
}
interface ClientApplicationDetailResponse extends ClientApplicationResponse {
  consents: ClientApplicationLocationConsentResponse[];
}
```

### auth-service
| metoda | putanja | body | response |
|---|---|---|---|
| GET | `/admin/client-applications/{id}/integration` | — | `ClientApplicationIntegrationResponse` (prazna konfiguracija ako još nije sačuvana; 404 ako partner ne postoji) |
| PUT | `/admin/client-applications/{id}/integration` | `UpdateClientApplicationIntegrationRequest` (zamenjuje celu konfiguraciju) | `ClientApplicationIntegrationResponse`; 404 partner ne postoji; 422 neispravan issuer/origin/scope; 400 validacija polja |

```ts
type TrustedIssuerType = "OIDC" | "PARTNER_KEY"; // PARTNER_KEY se čuva, ali token exchange ga još ignoriše
interface TrustedIssuer { type: TrustedIssuerType; issuer: string; jwksUri: string | null; audiences: string[] }
interface UpdateClientApplicationIntegrationRequest {
  trustedIssuers: TrustedIssuer[];  // OIDC: bar jedan audience; issuer jedinstven
  allowedOrigins: string[];         // scheme://host[:port], bez putanje i završne kose crte
  allowedScopes: string[];          // podskup ["reservation:create", "reservation:read:own"]
}
interface ClientApplicationIntegrationResponse extends UpdateClientApplicationIntegrationRequest { clientApplicationId: string }
```
422 poruke (ključevi): `error.client_application_integration.issuer_invalid`, `.origin_invalid`, `.scope_unsupported`.

## 6. Vlasnik biznisa (Reserva user token) — resource-service

| metoda | putanja | response |
|---|---|---|
| GET | `/client-application-consents` | `OwnerClientApplicationConsentResponse[]` — saglasnosti za lokacije biznisa čiji je korisnik OWNER |
| POST | `/client-application-consents/{id}/approve` | `ClientApplicationLocationConsentResponse`; 404 ako nije njegova ili ne postoji |
| POST | `/client-application-consents/{id}/revoke` | `ClientApplicationLocationConsentResponse`; 404 isto; opoziv odmah blokira nove rezervacije |

```ts
interface OwnerClientApplicationConsentResponse {
  id: string; status: ConsentStatus; decidedByUserId: string | null; decidedAt: string | null; createdAt: string;
  clientApplication: ClientApplicationResponse;  // naziv, scope partnera, enabled
  location: { id: string; businessId: string; name: string | null; addressLine1: string | null; city: string | null };
}
```
Origin-i (domen) i OAuth scope-ovi partnera **nisu** u ovom odgovoru — FE ih dohvata sa `GET ${AUTH_BASE}/client-applications/{clientApplication.id}/integration` (vidi 4); 404 tamo znači da partner još nema podešenu integraciju.

---

## FE zadaci (iz tiketa)
- **Admin:** lista i detalj klijentskih aplikacija; detalj prikazuje scope (uključujući `LOCATION_LIST`), statuse saglasnosti po lokaciji i integracionu konfiguraciju (izdavaoci sa issuer/jwks_uri/audiences, origin-i, dozvoljeni scope-ovi), sa izmenom (PUT); forma za registraciju dobija `LOCATION_LIST`.
- **Vlasnik biznisa:** stranica „Partneri“ u dashboard-u: zahtevi na čekanju, odobreni i opozvani po lokaciji, dugmići odobri/opozovi; pre odobravanja jasno se vidi ko je partner (naziv, domen iz `allowedOrigins`) i šta sme (`allowedScopes` + location scope).
- **E2E (FE):** admin podešava partnera, vlasnik odobrava i opoziva saglasnost; u `compose.e2e.yml` dodati **test OIDC izdavaoca** (statičan servis sa `/.well-known/openid-configuration` i `jwks.json`, test par ključeva samo za E2E); fixture potpisuje ID token, a test preko API-ja proverava zamenu tokena, rezervaciju sa saglasnošću i odbijanje bez nje (422 `CLIENT_APPLICATION_LOCATION_CONSENT_NOT_APPROVED`). Trusted issuer za test partnera: `issuer` = URL test servisa, `audiences` = audience koji fixture stavlja u ID token.

## Predlog
- FE feature: `partneri-saglasnosti-i-integracija`
- Komanda: `./scripts/implement-feature.sh reservation-fe partneri-saglasnosti-i-integracija`
