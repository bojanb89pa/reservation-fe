# FE brief — kontakt poruke (tiket #353)

Base URL: auth-service, context path `/auth`.

## Endpoints

### POST /auth/contact (javni; JWT opcion)
Request: `SubmitContactMessageRequest`. Response: `204 No Content` (isto i kad je honeypot popunjen).

### GET /auth/admin/contact-messages?status=&page=0&size=20 (ROLE_ADMIN)
Response: `PageResponse<ContactMessageResponse>`, najnovije prvo.

### GET /auth/admin/contact-messages/count?status=NEW (ROLE_ADMIN)
Response: `ContactMessageCountResponse` (status default NEW).

### GET /auth/admin/contact-messages/{id} (ROLE_ADMIN)
Response: `ContactMessageResponse`; 404 ako ne postoji.

### PATCH /auth/admin/contact-messages/{id} (ROLE_ADMIN)
Request: `UpdateContactMessageRequest`. Response: `ContactMessageResponse`. Izostavljeno polje ne menja vrednost; prazan `adminNote` briše belešku.

## TypeScript

```ts
type ContactCategory = 'GENERAL' | 'PRIVACY' | 'BUSINESS' | 'BUG';
type ContactMessageStatus = 'NEW' | 'ANSWERED' | 'ARCHIVED';

interface SubmitContactMessageRequest {
  name: string;        // <= 100
  email: string;       // validan email
  category: ContactCategory;
  message: string;     // 10-5000
  honeypot?: string | null; // skriveno polje, uvek prazno
}

interface UpdateContactMessageRequest {
  status?: ContactMessageStatus | null;
  adminNote?: string | null; // max 5000
}

interface ContactMessageResponse {
  id: string;
  name: string;
  email: string;
  category: ContactCategory;
  message: string;
  userId: string | null;
  status: ContactMessageStatus;
  answeredAt: string | null;
  answeredBy: string | null; // id admina
  adminNote: string | null;
  createdAt: string;
}

interface ContactMessageCountResponse { status: ContactMessageStatus; count: number }

interface PageResponse<T> { content: T[]; size: number; page: number; totalElements: number; totalPages: number }
```

## Greške
- 400 — nevalidno telo (`{ "message": "polje: razlog; ..." }`)
- 401 — admin ruta bez tokena
- 403 — korisnik nije ADMIN
- 404 — poruka ne postoji (`error.contact_message.not_found`)
- 429 — previše poruka sa IP adrese (`error.contact_message.rate_limit_exceeded`)

## Predlog za FE
Feature: `contact-form-and-admin-inbox`. Komanda: `./scripts/implement-feature.sh <fe-repo> contact-form-and-admin-inbox`.
Forma: skriveno `honeypot` polje; značka u admin dashboardu preko `/count?status=NEW`.
