# FE brief — pretraga korisnika i notify-membership dostupni vlasniku/članu

BE tiket: #144 (parent #140, epic `feature/43-vlasnik-biznisa-dodaje-zaposlene-i-suvlasnike-po-e`)
Servis: `auth-service` (FE-vidljive promene). `resource-service` dobija samo interne endpointe
(`/internal/**`) koje poziva auth-service — **FE ih nikad ne poziva**.

## 1. Pregled promena

- `GET /auth/users/search` više nije samo za `ROLE_ADMIN`: dostupan je svakom prijavljenom
  korisniku, ali rezultati su ograničeni na korisnike koji dele bar jedan biznis sa pozivaocem.
- `POST /auth/users/notify-membership` više nije samo za `ROLE_ADMIN`: dostupan je vlasniku
  biznisa (ili adminu). **Promenjen kontrakt: obavezno novo polje `businessId`; `businessName` i `role`
  su uklonjeni** (server ih sam čita iz resource-service-a).

## 2. Endpointi

### GET `/auth/users/search?query={string}&limit={int=10}`
- Auth: Bearer token (bilo koja uloga).
- Odgovor 200: `UserSummary[]` (može biti prazan).
- Admin vidi sve korisnike; ostali samo korisnike iz zajedničkih biznisa.
- 403 — pozivalac nije admin i nije član nijednog biznisa (`error.business.membership_required`).

### POST `/auth/users/notify-membership`
- Auth: Bearer token; mora biti OWNER biznisa `businessId` (ili admin).
- Telo: `NotifyBusinessMembershipRequest` (ispod).
- Odgovor 200: prazno telo.
- Pozvati nakon uspešnog `POST /businesses/{id}/owners` ili `/employees` u resource-service-u.
  Email mora već biti član (ili pending član) tog biznisa.

## 3. TypeScript

```ts
export interface UserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

// PROMENJENO: businessId dodat (obavezan); businessName i role uklonjeni
export interface NotifyBusinessMembershipRequest {
  businessId: string; // UUID biznisa kome je član dodat
  email: string;      // email dodatog člana
}

export interface ErrorResponse {
  message: string;
}
```

(Tačna polja `UserSummary` proveriti u postojećem FE tipu — oblik odgovora `GET /auth/users/search`
nije menjan.)

## 4. Greške

| Status | Ruta | Značenje |
|---|---|---|
| 400 | notify-membership | nedostaje `businessId` ili nevalidan email |
| 401 | obe | nema/istekao token |
| 403 | search | `BUSINESS_MEMBERSHIP_REQUIRED` — pozivalac nije član nijednog biznisa |
| 403 | notify-membership | `BUSINESS_OWNER_REQUIRED` — pozivalac nije vlasnik tog biznisa |
| 404 | notify-membership | `BUSINESS_MEMBERSHIP_NOT_FOUND` — email nije član tog biznisa |

## 5. Ponašanje u UI-ju

- **403 na search se tiho ignoriše** — tretirati kao prazan rezultat, bez toast-a i bez error stanja
  (korisnik bez članstva jednostavno nema koga da pretražuje).
- **Vlasnik unosi email ručno** — autocomplete pomaže samo za korisnike iz zajedničkih biznisa;
  za nepoznat email vlasnik ga kuca ručno, a notify-membership šalje pozivnicu ako nalog ne postoji.
- Pri pozivu notify-membership slati `businessId` biznisa u čijem kontekstu se član dodaje;
  ukloniti slanje `businessName` i `role`.

## 6. Predlog FE feature-a i komanda

Feature: `owner-member-search-and-notify`

```bash
./scripts/implement-feature.sh frontend owner-member-search-and-notify
```
