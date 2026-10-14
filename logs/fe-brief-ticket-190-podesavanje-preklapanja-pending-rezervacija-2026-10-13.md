# FE brief — Podešavanje preklapanja PENDING rezervacija (tiket #190, parent #186)

## Endpointi

### Izmena podešavanja (novo)
- `PATCH /businesses/{id}/overlapping-pending-reservations` (iza API prefiksa `/api`)
- Auth: Bearer token; samo vlasnik biznisa.
- Request: `{ "allowOverlappingPendingReservations": boolean }` (obavezno polje, bez njega 400)
- Response 200: `BusinessResponse` (ažurirani biznis)
- Statusi: 401 nema tokena, 404 biznis ne postoji, 409 pozivalac nije vlasnik (`error.business.owner_required`)
- Utiče samo na nove zahteve; postojeće PENDING rezervacije ostaju.

### Izmenjeno: `BusinessResponse` dobija polje `allowOverlappingPendingReservations`
Vraćaju ga svi endpointi koji vraćaju `BusinessResponse` (`GET /businesses/{id}`, `/businesses/me`, `/businesses/search`, ...). Podrazumevano `true`.

### Novi 409 na kreiranju i odobravanju rezervacije
- `POST /resources/{resourceId}/reservations`
- `POST /resources/{resourceId}/reservations/{id}/approve`
- `POST /client-applications/reservations`

Termin je zauzet: biznis ne dozvoljava preklapanje PENDING, ili postoji CONFIRMED rezervacija u istom terminu (odobravanje uvek proverava CONFIRMED).

## TypeScript

```ts
interface BusinessResponse {
  id: string;
  name: string;
  status: string;
  categoryId: string | null;
  category: BusinessCategoryResponse | null;
  imageUrl: string | null;
  allowOverlappingPendingReservations: boolean; // novo
}

interface UpdateOverlappingPendingSettingRequest {
  allowOverlappingPendingReservations: boolean;
}

interface ErrorResponse {
  message: string;      // lokalizovan tekst (Accept-Language)
  code?: string | null; // novo; za domenske greške
}
```

## Kodovi grešaka

Telo greške je sada `{ message, code }`. `code` je popunjen za domenske greške (ključ poruke, npr. `error.business.owner_required`), a `RESERVATION_SLOT_TAKEN` je stabilan kod za zauzet termin.

| code | HTTP | Značenje |
|---|---|---|
| `RESERVATION_SLOT_TAKEN` | 409 | Termin je zauzet; prikazati poruku i ponuditi izbor drugog termina |
| `error.business.owner_required` | 409 | Samo vlasnik sme da menja podešavanje |

## Predlog FE feature-a
- Naziv: `business-overlapping-pending-setting`
- UI: prekidač u podešavanjima biznisa, vidljiv samo vlasniku; `PATCH`, pa osvežiti biznis iz odgovora. Prikazati upozorenje da menja samo nove zahteve.
- Forme za rezervaciju i odobravanje: na 409 sa `code === 'RESERVATION_SLOT_TAKEN'` prikazati `message` i osvežiti dostupne termine.
- Predlog komande: `./scripts/implement-feature.sh <fe-repo> business-overlapping-pending-setting`
