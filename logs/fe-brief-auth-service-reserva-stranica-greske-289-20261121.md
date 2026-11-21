# FE brief — #289 Reserva stranica greške za /oauth2/authorize

Nema FE zavisnosti. Stranica se renderuje server-side (Thymeleaf) u auth-service-u.

## Endpoint-i
- `GET|POST /auth/oauth2/authorization-error` (interni forward cilj, ne poziva se direktno)
  - Request: nema tela; opciono `theme` (`dark`|`light`), `lang` (`sr`|`en`) ili kolačići `theme`/`lang`.
  - Response: HTML, status **400**, bez redirect-a. Prikazuje OAuth kod greške i link na `app.frontend-base-url`.
- `GET|POST /auth/oauth2/authorize` — kad klijent ili `redirect_uri` nisu validni (npr. odbijen CIMD dokument), umesto Whitelabel stranice vraća gore navedenu stranicu. Greške sa važećim klijentom i dalje idu redirect-om na `redirect_uri`.

## TypeScript interfejsi
Nema JSON DTO-a.

## Kodovi grešaka
- `invalid_client` — klijent nepoznat ili CIMD dokument odbijen.
- `invalid_request` — neispravan zahtev (podrazumevano kad kod nije dostupan).

## Predlog FE posla
Nije potreban. Opciono: proslediti `theme`/`lang` kolačiće da bi stranica pratila izbor korisnika.
