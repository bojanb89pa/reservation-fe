# FE Brief — api-resource-service-endpoint-i-za-registraciju-klijentskih-aplikacija
**Service:** resource-service (port 8080)
**Generated:** 2026-09-25
**Base URL:** `http://localhost:8080`
**Auth:** Bearer JWT — see per-endpoint notes below

---

## What changed on the BE

Two new endpoints for the "widget booking" feature:

1. An **admin-only** endpoint to register an external client application (a third-party site
   embedding the Reserva booking widget) and the scope of businesses/locations it is allowed
   to book into.
2. A **client-application-facing** endpoint that lets an already-authenticated client
   application create a reservation for one of its own users.

> **Blocked dependency — endpoint 2 is not runnable end-to-end yet.** Creating a reservation
> requires resource-service to resolve a `ClientApplicationPrincipal` (client application ID,
> guest email, linked Reserva user ID) from the JWT, analogous to how `JwtToUserConverter`
> resolves the normal `AuthenticatedUser` today. That converter depends on an **auth-service**
> change (client-application authentication via API key/client-credentials, plus resolving the
> guest's email against Reserva accounts) that does not exist yet — tracked as a separate
> auth-service ticket. Until that lands, `POST /api/client-applications/reservations` will not
> authenticate correctly against a real token. FE work against endpoint 1 (admin registration)
> can proceed now; FE work against endpoint 2 should be built against the documented contract
> below but cannot be smoke-tested against a live token yet.

### 1. Register a client application (admin only)

```
POST /api/admin/client-applications
```

| | |
|---|---|
| Auth | Bearer token, `ROLE_ADMIN` required |
| Request body | `CreateClientApplicationRequest` |
| Success | `200 OK` → `ClientApplicationResponse` |
| Errors | `401` no/invalid token, `403` caller is not `ROLE_ADMIN`, `400` validation failure |

`scope` is a discriminated union (JSON property `type`) mirroring how much of Reserva the
client application may book into — exactly one of three shapes:

**Example request — single location:**
```json
{
  "name": "Salon One's own booking widget",
  "scope": {
    "type": "SINGLE_LOCATION",
    "locationId": "9c1e2f3a-1111-2222-3333-444455556666"
  }
}
```

**Example request — multiple locations of one business:**
```json
{
  "name": "Chain X widget",
  "scope": {
    "type": "MULTIPLE_LOCATIONS",
    "businessId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "locationIds": ["9c1e2f3a-1111-2222-3333-444455556666", "9c1e2f3a-1111-2222-3333-444455557777"]
  }
}
```

**Example request — entire category:**
```json
{
  "name": "Beauty directory widget",
  "scope": {
    "type": "CATEGORY",
    "categoryId": "1a2b3c4d-0000-1111-2222-333344445555"
  }
}
```

**Example response:**
```json
{
  "id": "b2c3d4e5-6666-7777-8888-999900001111",
  "name": "Salon One's own booking widget",
  "scope": {
    "type": "SINGLE_LOCATION",
    "locationId": "9c1e2f3a-1111-2222-3333-444455556666"
  },
  "enabled": true
}
```

> **Note:** registering a client application only creates the Reserva-side scope record.
> Issuing it an API key / OAuth2 client-credentials so it can actually authenticate is a
> separate `auth-service` concern, not covered by this endpoint or this brief.

### 2. Create a reservation as a client application (blocked — see note above)

```
POST /api/client-applications/reservations
```

| | |
|---|---|
| Auth | Bearer token identifying the calling client application (not a Reserva user) |
| Request body | `CreateReservationByClientApplicationRequest` |
| Success | `200 OK` → same `ReservationResponse` shape as the regular reservation endpoints |
| Errors | `404` client application/resource/location/service not found, `422` client application disabled or target location outside its granted scope, or invalid duration |

**Example request:**
```json
{
  "resourceId": "9c1e2f3a-1111-2222-3333-444455556666",
  "locationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "serviceId": "1a2b3c4d-0000-1111-2222-333344445555",
  "startTime": "2026-10-01T10:00:00",
  "endTime": "2026-10-01T10:30:00"
}
```

**Example response:**
```json
{
  "id": "d4e5f6a7-2222-3333-4444-555566667777",
  "userId": "e5f6a7b8-3333-4444-5555-666677778888",
  "resourceId": "9c1e2f3a-1111-2222-3333-444455556666",
  "serviceId": "1a2b3c4d-0000-1111-2222-333344445555",
  "startTime": "2026-10-01T10:00:00",
  "endTime": "2026-10-01T10:30:00",
  "status": "PENDING_APPROVAL",
  "service": null,
  "resource": null,
  "business": null
}
```

`userId` is only populated when the client application's guest email already matches a
Reserva account (`linkedUserId` in the JWT); otherwise it is `null` and the reservation is
tracked only by the guest's email (not exposed in the response DTO today).

---

## TypeScript Interfaces

```typescript
type ClientApplicationScope =
  | { type: "SINGLE_LOCATION"; locationId: string }
  | { type: "MULTIPLE_LOCATIONS"; businessId: string; locationIds: string[] }
  | { type: "CATEGORY"; categoryId: string };

interface CreateClientApplicationRequest {
  name: string;
  scope: ClientApplicationScope;
}

interface ClientApplicationResponse {
  id: string;       // UUID
  name: string;
  scope: ClientApplicationScope;
  enabled: boolean;
}

interface CreateReservationByClientApplicationRequest {
  resourceId: string;   // UUID
  locationId: string;   // UUID
  serviceId: string;    // UUID
  startTime: string;    // ISO local date-time, e.g. "2026-10-01T10:00:00"
  endTime: string;      // ISO local date-time
}

interface ReservationResponse {
  id: string;                 // UUID
  userId: string | null;      // UUID
  resourceId: string;         // UUID
  serviceId: string;          // UUID
  startTime: string;
  endTime: string;
  status: string;             // e.g. "PENDING_APPROVAL"
  service: unknown | null;
  resource: unknown | null;
  business: unknown | null;
}

// All error responses (4xx) share this shape
interface ErrorResponse {
  message: string;
}
```

---

## Error Codes

| HTTP status | Endpoint | Trigger |
|---|---|---|
| `401 Unauthorized` | both | missing/invalid bearer token |
| `403 Forbidden` | `POST /admin/client-applications` | caller authenticated but not `ROLE_ADMIN` |
| `400 Bad Request` | `POST /admin/client-applications` | request body fails Bean Validation (blank `name`, missing/malformed `scope`, unknown `type` discriminator) |
| `404 Not Found` | `POST /client-applications/reservations` | client application, resource, location, or service does not exist |
| `422 Unprocessable Entity` | `POST /client-applications/reservations` | client application disabled, target location outside its granted scope, or chosen duration invalid for the service |

---

## Suggested FE Feature Name

`AdminClientApplications`

Admin-only screen to register and list external client applications (name + scope picker:
single location / multiple locations of one business / whole category). The widget booking
flow itself (`POST /client-applications/reservations`) is consumed by the **external widget**
embedded on third-party sites, not by the main Reserva FE app — no FE work is expected against
it in this codebase until the auth-service dependency above lands.

---

## Suggested Implementation Command

```
implement-feature admin-client-applications
```

Suggested folder structure:

```
features/
  admin/
    client-applications/
      components/
        ClientApplicationForm.tsx     ← name + scope-type picker (single location / multiple locations / category)
        ClientApplicationList.tsx     ← lists registered client applications
      api/
        useCreateClientApplication.ts ← POST /api/admin/client-applications
```

> **Dependency note:** do not start FE work for the widget reservation endpoint
> (`POST /api/client-applications/reservations`) until the auth-service child ticket adding
> client-application JWT claims (and resource-service's corresponding JWT-to-principal
> converter) is confirmed done — it cannot be authenticated against today.
