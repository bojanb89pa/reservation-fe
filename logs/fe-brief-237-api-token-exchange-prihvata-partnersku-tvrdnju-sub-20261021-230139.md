# FE brief — PARTNER_KEY izdavalac u admin formi integracije (tiket #237, epic #77)

Izvor: BE api sloj tiketa #237 (`auth-service`). FE treba da omogući adminu da partneru registruje
izdavaoca tipa `PARTNER_KEY` (put 2: partnerov backend potpisuje tvrdnju o korisniku) sa JWKS URL-om
**ili** inline JWK-om.

## Izmenjeni endpointi

### `GET /auth/admin/client-applications/{id}/integration` (ROLE_ADMIN)
Bez promene u ponašanju. `trustedIssuers[]` sada ima i polje `inlineJwk` (string ili `null`).

### `PUT /auth/admin/client-applications/{id}/integration` (ROLE_ADMIN)
Zamenjuje celu konfiguraciju. `trustedIssuers[]` prima novo opciono polje `inlineJwk`.

Request:
```json
{
  "trustedIssuers": [
    { "type": "OIDC", "issuer": "https://accounts.google.com", "jwksUri": null, "audiences": ["partner-web-client-id"] },
    { "type": "PARTNER_KEY", "issuer": "partner-backend", "inlineJwk": "{\"kty\":\"EC\",\"crv\":\"P-256\",\"x\":\"...\",\"y\":\"...\"}", "audiences": [] },
    { "type": "PARTNER_KEY", "issuer": "https://partner.example.com", "jwksUri": "https://partner.example.com/.well-known/jwks.json", "audiences": [] }
  ],
  "allowedOrigins": ["https://partner.example.com"],
  "allowedScopes": ["reservation:create"]
}
```

Response 200: `ClientApplicationIntegrationResponse` (vidi tipove ispod), `inlineJwk` je vraćen tačno kako je sačuvan.

Pravila za `PARTNER_KEY`:
- `issuer` — partnerov identifikator (URL ili neprozirni ID), bez razmaka; mora biti jedinstven u listi.
- **Tačno jedno** od `jwksUri` i `inlineJwk`. Prazan string se tretira kao nije poslat.
- `jwksUri` — apsolutni URL.
- `inlineJwk` — JSON **jednog** javnog JWK objekta: `kty` = `RSA`, ili `kty` = `EC` sa `crv` = `P-256`; bez privatnih članova (`d`, `p`, `q`, `dp`, `dq`, `qi`).
- `audiences` se za `PARTNER_KEY` ne koristi (pošalji `[]`); aud tvrdnje je uvek `"reserva"`.

Za `OIDC` `inlineJwk` mora biti `null`/izostavljen (inače 422 `issuer_invalid`).

### `POST /auth/oauth2/token` (token exchange, nije za admin FE)
Novi `subject_token_type` = `urn:ietf:params:oauth:token-type:jwt` za partnersku tvrdnju (put 2). FE za
admin ovo ne poziva; navedeno samo radi potpunosti (partnerov backend/SDK ga koristi).

## TypeScript tipovi (`@fe/domain`)

```ts
export type TrustedIssuerType = 'OIDC' | 'PARTNER_KEY';

export interface TrustedIssuerRequest {
  type: TrustedIssuerType;
  issuer: string;
  jwksUri?: string | null;
  audiences: string[];
  /** PARTNER_KEY only: one public JWK as a JSON string. Exactly one of jwksUri / inlineJwk for PARTNER_KEY. */
  inlineJwk?: string | null;
}

export interface UpdateClientApplicationIntegrationRequest {
  trustedIssuers: TrustedIssuerRequest[];
  allowedOrigins: string[];
  allowedScopes: string[];
}

export interface TrustedIssuerResponse {
  type: TrustedIssuerType;
  issuer: string;
  jwksUri: string | null;
  audiences: string[];
  inlineJwk: string | null;
}

export interface ClientApplicationIntegrationResponse {
  clientApplicationId: string;
  trustedIssuers: TrustedIssuerResponse[];
  allowedOrigins: string[];
  allowedScopes: string[];
}
```

## Greške (oblik tela: `{ "message": "..." }`)

| Status | Kod | Značenje |
|---|---|---|
| 400 | `error.client_application_integration.partner_key_invalid` | PARTNER_KEY izdavalac nema ni `jwksUri` ni `inlineJwk`, ima oba, `jwksUri` nije apsolutni URL ili `inlineJwk` nije ispravan javni RSA/EC P-256 JWK. Ništa nije sačuvano. |
| 400 | — (Bean Validation) | Nedostaje `type`/`issuer` ili je telo neispravno. |
| 404 | `error.client_application.not_found` | Klijentska aplikacija ne postoji. |
| 422 | `error.client_application_integration.issuer_invalid` | Neispravan/duplikat izdavalac (npr. OIDC sa `inlineJwk`, PARTNER_KEY issuer sa razmakom). |
| 422 | `error.client_application_integration.origin_invalid` | Neispravan origin. |
| 422 | `error.client_application_integration.scope_unsupported` | Nepodržan scope. |
| 401/403 | — | Nije prijavljen / nije admin. |

## Šta FE treba da uradi
- `@fe/domain`: dodati `PARTNER_KEY` u `TrustedIssuerType` i `inlineJwk` u tipove izdavaoca.
- `@fe/infrastructure`: HTTP klijent integracije šalje i čita `inlineJwk`; mapira 400 `partner_key_invalid` na grešku polja izdavaoca.
- `@fe/ui` (admin forma integracione konfiguracije):
  - izbor tipa izdavaoca `OIDC` / `PARTNER_KEY`;
  - za `PARTNER_KEY`: izbor izvora ključa (radio „JWKS URL" / „Inline JWK"), prikazati samo jedno polje; inline JWK kao textarea (JSON); sakriti `audiences`;
  - klijentska validacija: tačno jedno polje popunjeno, JWKS URL apsolutan, inline JWK parsabilan JSON objekat sa `kty` `RSA` ili `EC`+`crv` `P-256` i bez `d`; konačnu reč ima BE (400).
  - pri čuvanju za `PARTNER_KEY` slati nepopunjeno polje kao `null`, `audiences: []`.

## Predlog
- FE feature: `partner-key-trusted-issuer`
- Komanda: `./scripts/implement-feature.sh reservation-fe partner-key-trusted-issuer`

## Napomena: uputstvo za integraciju (put 2)
Uputstvo za integraciju partnera nije pronađeno u `reservation-be` (ni `docs/` ni `README.md`). Ako postoji
u demo epicu / FE repou, mora opisati put 2 ovako: `POST /auth/oauth2/token`, form-urlencoded,
`grant_type=urn:ietf:params:oauth:grant-type:token-exchange`, `client_id=<clientApplicationId>`,
`subject_token=<JWT>`, `subject_token_type=urn:ietf:params:oauth:token-type:jwt`, opciono `scope`.
JWT `alg` RS256 ili ES256 (opciono `kid` za JWKS). Claims: `iss` = registrovani PARTNER_KEY issuer,
`aud` sadrži `"reserva"`, `sub` obavezan, `email` obavezan (samo kontakt, nikad vezivanje naloga),
`email_verified` opcion, `exp` obavezan i najviše 300 s od prijema i od `iat`, `iat` opcion, `jti` obavezan
i jedinstven po partneru (ponovljen se odbija). Tolerancija sata 60 s. Greške: `invalid_grant` (tvrdnja
odbijena), `invalid_client` (nepoznat/isključen partner), `invalid_scope`, `invalid_request` (pogrešan
`subject_token_type`).
