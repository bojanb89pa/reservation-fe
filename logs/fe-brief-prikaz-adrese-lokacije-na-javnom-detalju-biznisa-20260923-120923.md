# FE Brief — prikaz-adrese-lokacije-na-javnom-detalju-biznisa
**Service:** resource-service (port 8080)
**Generated:** 2026-09-23
**Base URL:** `http://localhost:8080`
**Auth:** No auth required (endpoint made public by this ticket)

---

## What changed on the BE

No new endpoint and no response shape change. The existing endpoint used by the FE's
`useBusinessLocations` hook was previously behind the JWT filter by omission — it is now
added to the public route allowlist in `ResourceServerSecurityConfig`, matching the sibling
`/businesses/*/services` and `/businesses/*/resources` list routes that were already public.

```
GET /api/businesses/{businessId}/locations
```

| | |
|---|---|
| Auth | No auth required (public endpoint, as of this ticket) |
| Path param | `businessId: UUID` — **required** |
| Request body | None |
| Success | `200 OK` → `BusinessLocationResponse[]` (empty array if the business has no locations) |
| Errors | None documented — unknown `businessId` returns `200 OK` with an empty array, not `404` |

All other HTTP methods under `/api/businesses/{businessId}/locations/**` (`POST`, `PUT`,
`DELETE` — create/update/confirm/assign-resource/assign-service/etc.) are unchanged: they
still require a bearer token and existing ownership checks.

**Example request:**
```http
GET /api/businesses/3fa85f64-5717-4562-b3fc-2c963f66afa6/locations
```

**Example response:**
```json
[
  {
    "id": "9c1e2f3a-1111-2222-3333-444455556666",
    "businessId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Dorćol",
    "addressLine1": "Cara Dušana 15",
    "addressLine2": null,
    "city": "Belgrade",
    "postalCode": "11000",
    "countryCode": "RS",
    "latitude": 44.8201,
    "longitude": 20.4589,
    "timezone": "Europe/Belgrade",
    "phone": null,
    "email": null,
    "website": null,
    "googlePlaceId": null,
    "googleMapsUrl": null,
    "ownerConfirmed": true
  }
]
```

**Example empty response (business has no locations):**
```json
[]
```

---

## TypeScript Interface

```typescript
// GET /api/businesses/{businessId}/locations response item
interface BusinessLocation {
  id: string;                 // UUID
  businessId: string;         // UUID
  name: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  ownerConfirmed: boolean;
}

// All error responses (4xx) share this shape
interface ErrorResponse {
  message: string;
}
```

---

## Error Codes

| HTTP status | Trigger | Notes |
|---|---|---|
| `200 OK` | Business has zero locations, or `businessId` does not exist | Returns `[]` rather than `404` — no business-existence check is performed by this endpoint |
| `401 Unauthorized` | No longer applies to this `GET` route for anonymous callers | Still applies to `POST`/`PUT`/`DELETE` under `/locations/**` without a token |

---

## Suggested FE Feature Name

`BusinessDetailLocations`

Display block for `BusinessDetailPage.tsx` — renders every location returned by the
existing `useBusinessLocations` hook (street + number, city, postal code) for both
anonymous and authenticated visitors. Render nothing (no empty state, no error banner)
when the business has no locations. Route text through i18n (sr/en) and give the address
block an accessible name (e.g. a labelled `region`/`list` landmark) so an E2E test can find
it via `getByRole`.

---

## Suggested Implementation Command

```
implement-feature business-detail-locations
```

Suggested folder structure (adjust to match wherever `useBusinessLocations` already lives):

```
features/
  business-detail/
    components/
      BusinessLocationsList.tsx   ← renders BusinessLocation[] from useBusinessLocations, or nothing if empty
```

> **Dependency note:** `useBusinessLocations` already exists and already calls this
> endpoint — the only reason it previously failed for anonymous visitors was the BE 401/403.
> No new API client code should be needed; the remaining work is purely the display
> component, i18n strings, and the accessible markup for `getByRole`.
