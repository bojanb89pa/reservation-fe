# FE brief — CORS u auth-service-u za PUT/PATCH/DELETE na /users/** (tiket #162)

## Šta je promenjeno
Nema novih endpointa ni DTO-a. U auth-service-u CORS preflight (`OPTIONS`) za `/users/**` sada dozvoljava `GET, POST, PUT, PATCH, DELETE` (ranije samo `GET, POST`). `/oauth2/**`, `/connect/**` i `/login` ostaju na `GET, POST`.

## Endpointi koji sada rade iz browsera
- `PUT /auth/users/admin/accounts/{id}`
- `PATCH /auth/users/admin/accounts/{id}/status`
- `DELETE /auth/users/admin/accounts/{id}`

Request/response telo se ne menja (vidi postojeće admin-account DTO-e).

## TypeScript interfejsi
Bez novih interfejsa.

## Greške
- Preflight za PATCH/PUT/DELETE koji je ranije vraćao 403 sada vraća 200 sa `Access-Control-Allow-Methods`.
- 401 / 403 na samim pozivima i dalje znače da nema tokena / nije ADMIN.

## Predlog za FE
Nije potreban poseban FE feature; admin akcija promene statusa korisnika (epic:46) treba samo da radi. Ako FE ima workaround za CORS, ukloniti ga i proveriti PATCH status ručno.
