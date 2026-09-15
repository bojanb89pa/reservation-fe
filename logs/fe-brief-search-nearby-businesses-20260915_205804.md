# FE Brief — search-nearby-businesses
**Service:** resource-service (port 8080)
**Generated:** 2026-09-15
**Base URL:** `http://localhost:8080`
**Auth:** No auth required (public endpoint)

---

## Endpoints

### Search businesses nearest to a coordinate

```
GET /api/businesses/nearby
```

| | |
|---|---|
| Auth | No auth required (public endpoint) |
| Query param | `latitude: number` — **required**, decimal degrees, range [-90, 90] |
| Query param | `longitude: number` — **required**, decimal degrees, range [-180, 180] |
| Query param | `categoryId: UUID` — optional, restricts results to a single business category |
| Query param | `page: number` — zero-based page index (default `0`) |
| Query param | `size: number` — items per page (default `20`) |
| Header | `Accept-Language` — optional, defaults to `en`; used to resolve localized `category.name` |
| Request body | None |
| Success | `200 OK` → `PageResponse<NearbyBusinessResponse>`, ordered nearest-first |
| Errors | None documented — returns an empty page when no businesses match; malformed `latitude`/`longitude`/`categoryId` returns `400 Bad Request` from Spring before reaching the controller |

Only `ACTIVE` businesses are returned. Each result carries `distanceKm`, the great-circle distance from the search origin to the business's nearest confirmed location. If `categoryId` is omitted, businesses from all categories are returned.

**Example request:**
```http
GET /api/businesses/nearby?latitude=44.8125&longitude=20.4612&categoryId=a1b2c3d4-e5f6-7890-abcd-ef1234567890&page=0&size=20
Accept-Language: en
```

**Example response:**
```json
{
  "content": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Salon One",
      "categoryId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "category": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Hair Salon",
        "parentId": null,
        "symbol": "scissors",
        "color": "#FF00AA"
      },
      "imageUrl": "/api/businesses/3fa85f64-5717-4562-b3fc-2c963f66afa6/image",
      "location": {
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
      },
      "distanceKm": 1.02
    }
  ],
  "size": 20,
  "page": 0,
  "totalElements": 1,
  "totalPages": 1,
  "nextCursor": null,
  "prevCursor": null,
  "hasNext": null,
  "hasPrevious": null
}
```

**Example empty response (no businesses match):**
```json
{
  "content": [],
  "size": 20,
  "page": 0,
  "totalElements": 0,
  "totalPages": 0,
  "nextCursor": null,
  "prevCursor": null,
  "hasNext": null,
  "hasPrevious": null
}
```

---

## TypeScript Interfaces

```typescript
interface BusinessCategory {
  id: string;               // UUID
  name: string;              // localized per Accept-Language
  parentId: string | null;   // UUID
  symbol: string | null;
  color: string | null;
}

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

// Individual business item returned in the page content
interface NearbyBusiness {
  id: string;                       // UUID
  name: string;
  categoryId: string | null;        // UUID — null means no category assigned ("Others")
  category: BusinessCategory | null;
  imageUrl: string | null;          // relative path, e.g. /api/businesses/{id}/image
  location: BusinessLocation;       // the location distanceKm was measured against
  distanceKm: number;
}

// GET /api/businesses/nearby response
// Uses offset pagination — page/totalElements/totalPages are always populated;
// nextCursor/prevCursor/hasNext/hasPrevious are always null for this endpoint.
// content is sorted by ascending distanceKm (nearest first).
interface NearbyBusinessPageResponse {
  content: NearbyBusiness[];
  size: number;
  page: number | null;
  totalElements: number | null;
  totalPages: number | null;
  nextCursor: string | null;
  prevCursor: string | null;
  hasNext: boolean | null;
  hasPrevious: boolean | null;
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
| `200 OK` | No businesses within results, or unknown `categoryId` | Returns an empty page (`content: []`, `totalElements: 0`) rather than `404` — no category existence check is performed by this endpoint |
| `400 Bad Request` | Missing/malformed `latitude` or `longitude`, or malformed `categoryId` UUID | Raised by Spring's request-param binding before the controller runs; body shape is the framework default, not `ErrorResponse` |

---

## Suggested FE Feature Name

`NearbyBusinesses`

A location-based, read-only listing module — fetches and displays paginated active businesses ordered by distance from the caller's (typically geolocated) coordinates, with an optional category filter. Suitable for a "near me" landing view or as a filter mode on an existing business search/listing screen.

---

## Suggested Implementation Command

```
implement-feature nearby-businesses
```

Suggested folder structure:

```
features/
  nearby-businesses/
    api/
      nearbyBusinessesApi.ts       ← typed GET call; accepts { latitude, longitude, categoryId?, page, size }
    components/
      BusinessCard.tsx             ← single business display card (reuse if already exists from BusinessesByCategory)
      NearbyBusinessesList.tsx     ← renders paginated list of BusinessCard items, shows distanceKm per item
      NearbyBusinessesPage.tsx     ← page root; obtains latitude/longitude via browser geolocation
    hooks/
      useGeolocation.ts            ← wraps navigator.geolocation, exposes { latitude, longitude, error }
      useNearbyBusinesses.ts       ← query hook; params: { latitude, longitude, categoryId?, page, size }
```

> **Dependency note:** `latitude`/`longitude` are expected to come from the browser's Geolocation API (`useGeolocation`) or a manually-entered/selected location; this endpoint does not perform geocoding. If the FE already has a category filter UI (from `BusinessesByCategory`), reuse it to populate `categoryId` here.
