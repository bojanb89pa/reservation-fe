# FE brief — ticket #336 (obaveštenja o rezervacijama koje čekaju odobrenje)

**FE promena: nema.**

Dodati su samo interni service-to-service endpointi (nisu javni, nisu u FE kontraktu):
- `GET /internal/reservations/pending-approval-notifications?limit=` — 200, lista `{reservationId, businessId, businessName, resourceName, serviceName, startTime, endTime, approverUserIds[]}`
- `POST /internal/reservations/{reservationId}/approval-notified` — 204, 404 ako rezervacija ne postoji

Zove ih isključivo auth-service (scheduler), uz `X-Internal-Secret`. Nema TypeScript interfejsa za FE.

- Predlog FE feature-a: nema
- Predlog komande: nema
