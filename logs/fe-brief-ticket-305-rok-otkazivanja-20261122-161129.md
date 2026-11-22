# FE brief — rok za otkazivanje rezervacije (tiket #305, parent #301)

## Endpointi (resource-service, prefiks `/api`, Bearer token, samo vlasnik biznisa)

### PUT `/api/businesses/{id}/cancellation-deadline`
- Telo: `{ "minNoticeMinutes": 1440 }` (ceo broj 1..43200, obavezno)
- 200: `BusinessResponse` (sa `minNoticeMinutes`)
- 401 bez tokena, 404 biznis ne postoji, 409 pozivalac nije vlasnik (`error.business.owner_required`),
  400 ako polje nedostaje ili je van opsega (Bean Validation), 422 `error.business.cancellation_min_notice_invalid` iz use case-a

### DELETE `/api/businesses/{id}/cancellation-deadline`
- Bez tela. 200: `BusinessResponse` sa `minNoticeMinutes: null`. 401 / 404 / 409 kao gore.

### Izmenjeno: `BusinessResponse`
Svi endpointi koji vraćaju `BusinessResponse` (uključujući javne `GET /api/businesses/{id}`, `/search`, `/category/{id}`)
sada imaju novo polje `minNoticeMinutes` (nullable; null = bez roka).

## TypeScript

```ts
interface SetCancellationDeadlineRequest {
  minNoticeMinutes: number; // 1..43200
}

interface BusinessResponse {
  id: string;
  name: string;
  status: string;
  categoryId: string | null;
  category: BusinessCategoryResponse | null;
  imageUrl: string | null;
  allowOverlappingPendingReservations: boolean;
  minNoticeMinutes: number | null; // novo
}
```

## Greške

| Kod | HTTP | Značenje |
|---|---|---|
| `error.reservation.cancellation_deadline_passed` | 422 | Otkazivanje rezervacije posle isteka roka (vraća ga postojeći endpoint za otkazivanje; prikazati poruku korisniku) |
| `error.business.cancellation_min_notice_invalid` | 422 | Vrednost roka van 1..43200 |
| `error.business.owner_required` | 409 | Pozivalac nije vlasnik biznisa |

Telo greške: `{ "message": "...", "code": "..." }`; poruka je lokalizovana (en / sr) prema `Accept-Language`.

## Predlog FE feature-a
- Naziv: `business-cancellation-deadline`
- Owner podešavanja biznisa: unos "otkazivanje najkasnije X pre termina" (minuti/sati/dani, konverzija u minute, max 30 dana),
  dugme za uklanjanje roka; prikaz trenutne vrednosti iz `minNoticeMinutes`.
- Ekran rezervacije/otkazivanja: obraditi 422 `error.reservation.cancellation_deadline_passed` jasnom porukom.
- Predlog komande: `./scripts/implement-feature.sh frontend business-cancellation-deadline`
