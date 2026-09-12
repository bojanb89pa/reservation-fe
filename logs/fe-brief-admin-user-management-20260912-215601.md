# FE brief — Admin upravljanje korisnicima (CRUD, pretraga, promena statusa)

BE tiket: #56 (parent #51, epic #9 `feature/9-administracija-korisnika`)
Servis: `auth-service`, sve putanje su iza prefiksa `/auth`.

---

## 1. Pregled

Novi kontroler `AdminUserController`, mount na `/users/admin/accounts` (spolja:
`/auth/users/admin/accounts`). Svi endpointi zahtevaju ulogovanog korisnika sa rolom
`ROLE_ADMIN` (Bearer token) — pristup se ograničava na nivou Spring Security URL matcher-a, ne
po korisniku koji poziva. Postojeći `GET /auth/users/all` (prosta lista, bez pretrage) ostaje
netaknut i i dalje postoji.

**Zašto `/accounts` sufiks, a ne prosto `/auth/users/admin`:** postojeći endpoint
`POST /auth/users/admin` (iz `UserController`, provisioning admin naloga preko
`CreateAdminUserUseCase` — drugačija svrha, kreira nalog sa ADMIN rolom bez CRUD konteksta) već
zauzima tu tačnu putanju. Mapiranje novog kreiranja korisnika na istu putanju bi izazvalo
ambiguous mapping grešku pri pokretanju `auth-service`-a, pa je novi CRUD resurs nazvan
`/auth/users/admin/accounts`.

---

## 2. Endpointi

### `GET /auth/users/admin/accounts` — pretraga/listanje korisnika (paginirano)

Query parametri (svi opcioni osim paginacije, koja ima default):

| Parametar | Tip | Opis |
|---|---|---|
| `search` | `string` | Case-insensitive substring pretraga po imenu/prezimenu/emailu; izostavi ili pošalji prazno za sve korisnike |
| `status` | `"ACTIVE" \| "INACTIVE" \| "BLOCKED"` | Filtrira po statusu naloga |
| `page` | `number` | Zero-based, default `0` |
| `size` | `number` | Veličina stranice, default `20` |

Odgovor `200 OK`:

```json
{
  "content": [ /* niz UserResponse */ ],
  "size": 20,
  "page": 0,
  "totalElements": 42,
  "totalPages": 3
}
```

### `GET /auth/users/admin/accounts/{id}` — detalji korisnika po ID-u

- Odgovor `200 OK`: `UserResponse`.
- `404` ako korisnik sa datim ID-jem ne postoji.

### `POST /auth/users/admin/accounts` — kreiranje novog naloga

Nalog se kreira odmah aktivan (`status: ACTIVE`), bez email aktivacije — za razliku od
`POST /auth/users/register`.

Telo zahteva:

```json
{
  "email": "novi.korisnik@example.com",
  "password": "lozinka123",
  "firstName": "Ana",
  "lastName": "Anić",
  "roles": ["ROLE_USER"]
}
```

- `roles` je obavezno i ne sme biti prazno.
- Odgovor `200 OK`: `UserResponse`.
- `409` ako email već postoji.

### `PUT /auth/users/admin/accounts/{id}` — izmena podataka korisnika

Menja **samo** email, ime, prezime i role. Ne menja lozinku, status niti profilnu sliku — za to
postoje posebni endpointi ispod.

```json
{
  "email": "izmenjen@example.com",
  "firstName": "Ana",
  "lastName": "Anić",
  "roles": ["ROLE_USER", "ROLE_ADMIN"]
}
```

- Odgovor `200 OK`: ažurirani `UserResponse`.
- `404` ako korisnik ne postoji.

### `PATCH /auth/users/admin/accounts/{id}/status` — aktivacija / deaktivacija / blokiranje

Jedan endpoint parametrizovan ciljnim statusom (nema posebnih ruta za activate/deactivate/block).

```json
{ "status": "BLOCKED" }
```

`status` je jedna od `"ACTIVE"`, `"INACTIVE"`, `"BLOCKED"`.

- Odgovor `200 OK`: ažurirani `UserResponse`.
- `404` ako korisnik ne postoji.

> BE napomena (WARNING u kodu use case-a): moguće je da "blokiranje" u budućnosti zahteva
> razlog/audit trag koji "deaktivacija" ne zahteva — trenutno je to isti endpoint/kontrakt za sve
> tri tranzicije. Ako dizajn zahteva polje za razlog bloka, javiti nazad BE strani.

### `POST /auth/users/admin/accounts/{id}/reset-password` — resetovanje lozinke

```json
{ "newPassword": "novaLozinka123" }
```

- Odgovor `200 OK`: ažurirani `UserResponse`.
- `404` ako korisnik ne postoji.
- Nema trenutne validacije jačine lozinke na BE strani van `@NotBlank` — razmotriti klijentsku
  validaciju (minimalna dužina i sl.) dok se BE pravilo ne precizira.

### `DELETE /auth/users/admin/accounts/{id}` — trajno brisanje naloga

- Odgovor `204 No Content` na uspeh (bez tela).
- `404` ako korisnik ne postoji.
- Nepovratna operacija — FE treba da traži potvrdu pre poziva.

---

## 3. Promena u postojećem `UserResponse`

`UserResponse` dobija novo polje `status`. Utiče na **sve** postojeće endpointe koji vraćaju
`UserResponse` (`POST /auth/users/register`, `POST /auth/users/admin` [postojeći,
admin-provisioning endpoint iz `UserController` — ne meša se sa novim
`/auth/users/admin/accounts` CRUD resursom], `GET /auth/users`, `GET /auth/users/all`,
`POST /auth/users/google-sign-in`, profilna slika endpointi, `GET /auth/users/batch`).

---

## 4. TypeScript interfejsi

```ts
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type Role = 'ROLE_USER' | 'ROLE_ADMIN';

export interface UserResponse {
  id: string | null;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  enabled: boolean | null;
  status: UserStatus;
  profilePictureUrl: string | null;
}

export interface PageResponse<T> {
  content: T[];
  size: number;
  page: number | null;
  totalElements: number | null;
  totalPages: number | null;
  nextCursor: string | null;
  prevCursor: string | null;
  hasNext: boolean | null;
  hasPrevious: boolean | null;
}

export interface AdminSearchUsersParams {
  search?: string;
  status?: UserStatus;
  page?: number;
  size?: number;
}

export interface AdminCreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: Role[];
}

export interface AdminUpdateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface ResetUserPasswordRequest {
  newPassword: string;
}

/** Telo svake greške */
export interface ErrorResponse {
  message: string;
}
```

---

## 5. Greške

Telo svake greške je `{ "message": "..." }`. Raspoznavanje raditi po **HTTP statusu**.

| Status | Kada se javlja | Endpoint(i) |
|---|---|---|
| `404` | Korisnik sa datim ID-jem ne postoji (`ErrorCodes.USER_NOT_FOUND`) | `GET/PUT/DELETE .../accounts/{id}`, `PATCH .../accounts/{id}/status`, `POST .../accounts/{id}/reset-password` |
| `409` | Email već registrovan (`ErrorCodes.USER_EMAIL_ALREADY_EXISTS`) | `POST /users/admin/accounts` |
| `400` | Neispravno telo zahteva (npr. prazno ime, nevalidan email, prazan `roles`) | svi POST/PUT/PATCH |
| `403` | Ulogovan korisnik nema `ROLE_ADMIN` | svi `/users/admin/accounts/**` |
| `401` | Nedostaje ili je istekao token | svi `/users/admin/accounts/**` |

Kodovi grešaka na BE strani, radi lakšeg praćenja logova:
`error.user.not_found`, `error.user.email_already_exists`.

---

## 6. Zahtevi za dizajn

- **Tabela korisnika** sa kolonama: ime i prezime, email, role (chip/badge lista), status
  (badge — zelen za `ACTIVE`, siv za `INACTIVE`, crven za `BLOCKED`), akcije.
- **Pretraga** — tekstualno polje (`search`) + dropdown filter po statusu, oba kao query
  parametri uz debounce na tekstualnoj pretrazi.
- **Akcije po redu**: izmena podataka (modal/forma sa email/ime/prezime/role), promena statusa
  (dropdown ili tri dugmeta: aktiviraj/deaktiviraj/blokiraj — sva tri idu na isti
  `PATCH .../status` endpoint sa različitim `status` vrednostima), reset lozinke (forma sa novom
  lozinkom + potvrda), brisanje (potvrda pre poziva, nepovratno).
- **Kreiranje naloga** — forma sa email/lozinka/ime/prezime + multi-select za role.
- Prikazati `enabled` i `status` odvojeno ako oba postoje u odgovoru — `enabled` je istorijski
  vezan za email-aktivaciju self-service registracije, `status` je administrativno stanje koje
  ovaj admin panel menja; za admin-kreirane naloge oba će po pravilu biti "aktivno"/`true`, ali
  ne treba pretpostavljati da su uvek sinhronizovana.

---

## 7. Predlog FE feature-a

- Naziv: `admin-user-management`
- Grana: `feature/9-administracija-korisnika` u `reservation-fe`
- Predložena komanda:

```bash
./scripts/implement-feature.sh admin-user-management
```

Obim: `AdminUserApiRepository` (search/get/create/update/updateStatus/resetPassword/delete),
tabela korisnika sa pretragom i paginacijom, forme za kreiranje/izmenu, kontrole za promenu
statusa, modal za reset lozinke, potvrda pre brisanja.
