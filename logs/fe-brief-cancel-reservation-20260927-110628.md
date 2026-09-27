# FE Brief — cancel-reservation
**Service:** resource-service (port 8080)
**Generated:** 2026-09-27
**Base URL:** `http://localhost:8080/api`
**Auth:** Bearer JWT (issued by auth-service)

---

## Endpoint

### Cancel a reservation as the user who made it

```
POST /api/resources/{resourceId}/reservations/{id}/cancel
```

| | |
|---|---|
| Auth | Bearer JWT required — caller must be the reservation's own `userId` (not a business employee) |
| Path params | `resourceId: UUID` — public ID of the resource · `id: UUID` — public ID of the reservation |
| Request body | None |
| Success | `200 OK` → `ReservationResponse` with `status: "CANCELLED"` |
| Errors | `404` reservation not found · `409` caller did not make this reservation · `422` reservation's current status is not cancellable under the business's cancellation policy |

**Example request:**
```http
POST /api/resources/b1c2d3e4-f5a6-7890-abcd-ef1234567890/reservations/a1b2c3d4-e5f6-7890-abcd-ef1234567890/cancel
Authorization: Bearer <user-jwt>
```

**Example response:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
  "resourceId": "b1c2d3e4-f5a6-7890-abcd-ef1234567890",
  "serviceId": "c1d2e3f4-a5b6-7890-abcd-ef1234567890",
  "startTime": "2026-06-10T10:00:00",
  "endTime": "2026-06-10T10:30:00",
  "status": "CANCELLED"
}
```

---

## TypeScript Interfaces

```typescript
// Returned by POST .../cancel
interface ReservationResponse {
  id: string;            // UUID
  userId: string | null; // UUID — the customer who made the reservation
  resourceId: string;    // UUID
  serviceId: string;     // UUID
  startTime: string;     // ISO 8601 local datetime, e.g. "2026-06-10T10:00:00"
  endTime: string;       // ISO 8601 local datetime, e.g. "2026-06-10T10:30:00"
  status: ReservationStatus;
}

type ReservationStatus = 'PENDING_APPROVAL' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

// Returned by all error responses (4xx)
interface ErrorResponse {
  message: string;
}
```

---

## Error Codes

| HTTP status | Error code | Trigger | Notes |
|---|---|---|---|
| `404 Not Found` | `error.reservation.not_found` | `{id}` path param references a missing reservation | Thrown before ownership or policy checks |
| `409 Conflict` | `error.reservation.user_not_authorized` (`RESERVATION_USER_NOT_AUTHORIZED`) | The authenticated user is not the one who made the reservation | Do not confuse with the employee-authorization conflict used by approve/reject — this check is against `Reservation.userId`, not employee membership |
| `422 Unprocessable Entity` | `error.reservation.cancellation_not_allowed` (`RESERVATION_CANCELLATION_NOT_ALLOWED`) | The reservation's current status is not allowed for cancellation by the owning business's cancellation policy | The allowed statuses depend on the business's configured cancellation policy, not a fixed list — the FE should surface the server error message rather than pre-computing cancellability client-side |
| `401 Unauthorized` | — | No or invalid Bearer token | Standard Spring Security response; no body |

All `4xx` error bodies have the shape `{ "message": "..." }`.

---

## Suggested FE Feature Name

`ReservationCancellation`

A customer-facing feature that lets a user cancel their own reservation, subject to the business's cancellation policy. Complementary to the existing employee-facing `ReservationApproval` feature (approve/reject).

---

## Suggested Implementation Command

```
implement-feature reservation-cancellation
```

Suggested folder structure:

```
features/
  reservation-cancellation/
    api/
      reservationCancellationApi.ts   ← typed POST call for cancel; accepts resourceId + reservationId
    components/
      CancelReservationButton.tsx     ← confirmation prompt + cancel action on a reservation the user owns
    hooks/
      useCancelReservation.ts         ← mutation hook; invalidates the user's reservation list query on success
    types/
      reservationCancellation.types.ts ← ReservationResponse, ReservationStatus, ErrorResponse interfaces
```

> **Access control note:** Only render the Cancel button on reservations where `reservation.userId` matches the logged-in user's own ID. Rendering it for reservations made by other users would result in a `409` from the backend.
>
> **UX note:** Since cancellability depends on the business's cancellation policy (not a fixed status list), the FE cannot reliably decide in advance whether cancellation is allowed. Attempt the call and handle the `422` response by showing the server's message (e.g. "too close to start time to cancel").
