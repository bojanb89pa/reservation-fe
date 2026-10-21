# Demo partner (Beogradski Berberin)

Statičan Vite sajt izmišljenog partnera. Ponaša se kao pravi partner: widget ugrađuje samo preko
javnog loader-a `{VITE_RESERVA_ORIGIN}/widget.js` i queue-a `window.ReservaWidget`, i ne uvozi
nijedan `@fe/*` paket (eslint to zabranjuje). Nije deo root `yarn build`.

```bash
cp apps/demo-partner/.env.example apps/demo-partner/.env.local   # popuni VITE_DEMO_CLIENT_ID
yarn dev:demo-partner        # http://localhost:5175
yarn build:demo-partner      # yarn workspace @fe/demo-partner build → apps/demo-partner/dist
```

## Konfiguracija (`.env.example`)

| Promenljiva | Značenje |
|---|---|
| `VITE_RESERVA_ORIGIN` | origin sa kog se učitava `/widget.js` |
| `VITE_DEMO_CLIENT_ID` | javni ID client application-a partnera |
| `VITE_DEMO_LOCATION_ID` | lokacija sa saglasnošću (widget desno) |
| `VITE_DEMO_NO_CONSENT_LOCATION_ID` | lokacija bez saglasnosti; na `onUnavailable` se prikazuje kontakt |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID (javna vrednost) |
| `VITE_DEMO_IDENTITY` | `test` = test režim, prazno = Google |

## Prijava

Google Identity Services, samo u browser-u: ID token ostaje u memoriji (bez kolačića i backend-a) i
vraća se widget-u kroz `getIdentityToken`. Posle logina i logouta poziva se `refreshIdentity`.

## Test režim (`VITE_DEMO_IDENTITY=test`)

Samo za E2E i lokalni rad. Umesto Google dugmeta (dugme „Prijava (test)“) ID token stiže od test
OIDC izdavaoca (`e2e/oidc-issuer`), i to prvim od:

1. `window.__DEMO_ID_TOKEN__` — Playwright ga postavi pre učitavanja
   (`page.addInitScript`) ili kasnije, pa pozove `window.ReservaWidget.refreshIdentity()`;
2. query parametar `?idToken=<jwt>`.

Ako je token dostupan pri učitavanju, korisnik je prijavljen od starta; „Odjavi se“ ga odjavljuje
(widget dobija `null`), a „Prijava (test)“ ponovo uzima trenutni token.

Ovaj kod (`src/testIdentity.ts`) ne postoji u produkcijskom build-u: grana iza
`import.meta.env.VITE_DEMO_IDENTITY === 'test'` u `src/identity.ts` nestaje dead-code
eliminacijom. `src/__tests__/bundle.test.ts` pravi produkcijski bundle i proverava da test koda
nema u njemu.
