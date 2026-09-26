# FE Brief — jwt-to-clientapplicationprincipal-converter
**Service:** resource-service (port 8080)
**Generated:** 2026-09-26
**Base URL:** `http://localhost:8080`
**Auth:** Bearer JWT — see note below

---

## What changed on the BE

This ticket has **no new or changed HTTP endpoints** — it is an internal security-layer fix.
No FE action is required from this brief alone.

Context: `POST /client-applications/reservations` (added in a prior ticket, see
`fe-brief-api-resource-service-endpoint-i-za-registraciju-klijentskih-aplikacija-20260925-230304.md`)
needs to resolve a `ClientApplicationPrincipal` from the JWT presented by an external client
application, the same way `JwtToUserConverter` resolves a Reserva user's `AuthenticatedUser`
from a login token. That converter did not exist yet — the endpoint was flagged with a `WARNING`
comment and could not authenticate a real token.

This ticket adds that converter (`JwtToClientApplicationConverter`) plus a dispatcher
(`ResourceServerJwtConverter`) that inspects the JWT claims and picks the right converter:
tokens carrying a `clientApplicationId` claim are treated as client-application
client-credentials tokens; all other tokens are treated as normal Reserva user login tokens.
The `WARNING` comment on the endpoint has been removed.

> **Still blocked end-to-end.** `auth-service` does not issue `clientApplicationId` /
> `guestEmail` / `linkedUserId` claims yet — that is a separate, not-yet-merged
> `auth-service:application` ticket. Until it lands, `POST /client-applications/reservations`
> cannot be exercised with a real token (it can only be unit-tested with mock JWT claims, which
> this ticket does). No change to the endpoint's request/response contract — see the brief
> referenced above for its shape.

---

## Error Codes

No new error codes. `401 Unauthorized` still applies to any request without a valid bearer
token; behavior for a *valid* client-application token is now correctly wired up (previously
would have been treated as a malformed/missing Reserva user token).

---

## Suggested FE Feature Name

None — no FE work is unblocked or required by this ticket. FE work against
`POST /client-applications/reservations` should continue to wait on the `auth-service` claims
ticket, as noted in the earlier brief.

---

## Suggested Implementation Command

Not applicable — no FE-facing change.
