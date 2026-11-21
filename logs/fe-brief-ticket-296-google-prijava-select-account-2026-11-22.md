# FE brief — ticket #296: Google prijava uvek traži izbor naloga

## Endpointi
- Nema novih ni izmenjenih endpointa, request/response DTO-a ni kodova grešaka.
- `GET /auth/oauth2/authorization/google` i dalje vraća 302 ka Google-u, ali redirect URL sada uvek sadrži `prompt=select_account`. Ostali parametri (client_id, scope, redirect_uri, state) su isti.

## TypeScript interfejsi
- Nema promena.

## Greške
- Nema novih.

## Predlog za FE
- Nije potrebna izmena. Google dugme na Reserva prijavi i dalje vodi na `/oauth2/authorization/google`.
- Ponašanje koje korisnik vidi: Google uvek prikazuje izbor naloga, pa nema tihe prijave drugim nalogom iz browsera.
- FE feature: nije potreban. Ne treba pokretati FE implementaciju.
