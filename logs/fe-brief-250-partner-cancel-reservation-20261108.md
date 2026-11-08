# FE brief — partner otkazuje rezervaciju (tiket #250, epic #247)

## Endpoint

| Method | Path | Scope | Opis |
|---|---|---|---|
| POST | `/api/client-applications/reservations/{id}/cancel` | `reservation:cancel:own` | Otkazuje rezervaciju koju je partner napravio za korisnika iz tokena |

- Nema request body-ja. `{id}` je UUID rezervacije.
- Bearer token dobijen token exchange-om; token mora imati scope `reservation:cancel:own`.
- Odgovor 200 je isti oblik kao `GET /api/client-applications/reservations/{id}`.
- `operationId`: `cancelPartnerReservation` (javni spec `/api/v3/api-docs/public`).

## TypeScript

```ts
// Odgovor: ReservationResponse (isti kao GET /client-applications/reservations/{id})
// Poziv: POST bez body-ja
async function cancelPartnerReservation(id: string): Promise<ReservationResponse>;
```

## Greške

| Status | Značenje |
|---|---|
| 401 | Nema tokena ili je nevažeći |
| 403 | Token nema scope `reservation:cancel:own` |
| 404 | Rezervacija ne postoji ili nije od tog partnera/korisnika (isto za oba) |
| 422 | Politika otkazivanja biznisa ne dozvoljava otkazivanje iz trenutnog statusa (`RESERVATION_CANCELLATION_NOT_ALLOWED`) |

## Predlog za FE

- Feature: `widget-cancel-reservation`. Dugme za otkazivanje u widget-u NIJE deo ovog tiketa.
- Predlog komande: `./scripts/implement-feature.sh widget widget-cancel-reservation`
- Partnerski token mora da traži scope `reservation:cancel:own` pri token exchange-u.
