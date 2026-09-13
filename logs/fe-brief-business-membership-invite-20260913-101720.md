# FE brief — Pretraga korisnika, notifikacija i razrešavanje pending članstava (tiket #63, parent #52)

BE tiket: #63 (parent #52, epic #10 `feature/10-dodavanje-biznis-vlasnika-i-zaposlenih`)
Servisi: `auth-service` (prefiks `/auth`) i `resource-service` (bez prefiksa, `/api` po postojećoj konvenciji frontenda).

---

## 1. Pregled

Tri promene koje zajedno podržavaju flow "admin dodaje vlasnika/zaposlenog biznisu preko email-a"
iz tiketa #52:

1. Novi autocomplete endpoint u `auth-service` za pretragu korisnika po delu email-a/imena, za
   formu koja bira postojećeg korisnika.
2. Novi endpoint u `auth-service` koji šalje mejl obaveštenje/pozivnicu nakon što je korisnik
   dodat kao vlasnik/zaposleni — FE ga zove **odmah nakon** uspešnog poziva `resource-service`
   `POST /businesses/{id}/owners` ili `/employees`.
3. `GET /businesses/me` u `resource-service` sada, pored liste biznisa, lenjo razrešava svako
   "pending" članstvo (dodato preko email-a koji u trenutku dodavanja nije pripadao nijednom
   nalogu) za email ulogovanog korisnika — nema poseban endpoint za ovo, dešava se automatski
   čim FE pozove `/businesses/me` nakon logina/registracije.

**Bezbednosna napomena (BE strana i dalje verifikuje):** `POST /users/search` i
`POST /users/notify-membership` su namerno ograničeni na `ROLE_ADMIN` jer se koriste isključivo u
admin formi za upravljanje članstvom biznisa (da mejl notifikacija ne bi mogla da se pošalje na
proizvoljnu adresu od strane bilo kog ulogovanog korisnika). Ako FE forma za dodavanje
vlasnika/zaposlenog treba da bude dostupna i ne-admin korisnicima (npr. vlasniku biznisa), javiti
nazad BE strani — trenutno `addOwner`/`addEmployee` u `resource-service` su takođe ograničeni na
`ROLE_ADMIN` po istoj konvenciji.

---

## 2. Endpointi

### `GET /auth/users/search` — autocomplete korisnika

Query parametri:

| Parametar | Tip | Opis |
|---|---|---|
| `query` | `string` | Obavezan, deo email-a ili imena/prezimena |
| `limit` | `number` | Opciono, default `10`, maksimalan broj rezultata |

Zahteva `ROLE_ADMIN`.

Odgovor `200 OK`:

```json
[
  { "id": "uuid", "email": "ana@example.com", "firstName": "Ana", "lastName": "Anić" }
]
```

Nikad ne vraća role, lozinku, status naloga niti druga osetljiva polja — samo id/email/ime/prezime.
Prazna lista ako nema poklapanja (ne `404`).

### `POST /auth/users/notify-membership` — notifikacija o dodavanju u biznis

Zahteva `ROLE_ADMIN`. Pozvati **posle** uspešnog `resource-service`
`POST /businesses/{id}/owners` ili `POST /businesses/{id}/employees`.

Telo zahteva:

```json
{
  "email": "ana@example.com",
  "businessName": "Salon Ana",
  "role": "OWNER"
}
```

`role` je `"OWNER"` ili `"EMPLOYEE"`.

- Odgovor `200 OK`, bez tela.
- Ako `email` već pripada registrovanom nalogu: šalje se informativni mejl da je korisnik dodat.
- Ako `email` ne pripada nijednom nalogu: šalje se pozivnica sa linkom za registraciju; kad se ta
  osoba kasnije registruje i prvi put pozove `GET /businesses/me`, članstvo se automatski povezuje
  sa novim nalogom (vidi tačku 3).

### `GET /businesses/me` — bez promene ugovora, nova nuspojava

Putanja, parametri i odgovor (`PageResponse<BusinessResponse>`) su **nepromenjeni**. Jedina razlika
je da BE sada, pre nego što vrati listu, razrešava sva pending članstva za email ulogovanog
korisnika. FE ne treba ništa da menja u pozivu — samo je bitno da FE **pozove ovaj endpoint bar
jednom nakon logina/registracije** da bi se eventualna pending članstva povezala (npr. na
dashboard-u koji i inače prikazuje "moje biznise").

> BE napomena (WARNING u kodu): ovo je konzervativan izbor mesta za razrešavanje pending
> članstava — postoji mogućnost da BE strana kasnije uvede poseban endpoint
> (npr. `POST /businesses/me/resolve-memberships`) pozvan eksplicitno odmah posle logina. Ako se to
> desi, javiće se nazad da FE prilagodi poziv.

---

## 3. TypeScript interfejsi

```ts
export type BusinessMemberRole = 'OWNER' | 'EMPLOYEE';

export interface UserSummaryResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface SearchUsersParams {
  query: string;
  limit?: number;
}

export interface NotifyBusinessMembershipRequest {
  email: string;
  businessName: string;
  role: BusinessMemberRole;
}

/** Telo svake greške */
export interface ErrorResponse {
  message: string;
}
```

---

## 4. Greške

Telo svake greške je `{ "message": "..." }`. Raspoznavanje raditi po **HTTP statusu**.

| Status | Kada se javlja | Endpoint(i) |
|---|---|---|
| `400` | Neispravno telo (npr. nevalidan email, prazan `businessName`, nedostaje `role`) | `POST /auth/users/notify-membership` |
| `401` | Nedostaje ili je istekao token | svi opisani endpointi |
| `403` | Ulogovan korisnik nema `ROLE_ADMIN` | `GET /auth/users/search`, `POST /auth/users/notify-membership` |

`GET /auth/users/search` nikad ne vraća `404` — nepostojanje poklapanja je prazna lista.
`GET /businesses/me` zadržava postojeće ponašanje grešaka (nepromenjeno ovim tiketom).

---

## 5. Zahtevi za dizajn

- **Forma za dodavanje vlasnika/zaposlenog** (admin panel biznisa): tekstualno polje sa
  autocomplete-om koje poziva `GET /auth/users/search?query=...` sa debounce-om; kad admin izabere
  postojećeg korisnika ILI ukuca email koji ne postoji u listi predloga, forma šalje email direktno
  na `resource-service` `POST /businesses/{id}/owners`/`/employees` (taj endpoint prihvata samo
  email, ne userId — pending flow je već podržan na BE strani).
- Nakon uspešnog `addOwner`/`addEmployee` poziva, **odmah** pozvati
  `POST /auth/users/notify-membership` sa istim email-om, imenom biznisa i rolom — prikazati
  potvrdu ("Pozivnica poslata na {email}") bez obzira da li je korisnik već registrovan ili ne (BE
  ne razlikuje odgovor po tome).
- Nema potrebe za dodatnim UI-jem za razrešavanje pending članstava — to je transparentno za
  korisnika, dešava se u pozadini pri sledećem pozivu `/businesses/me`.

---

## 6. Predlog FE feature-a

- Naziv: `business-membership-invite`
- Grana: `feature/10-dodavanje-biznis-vlasnika-i-zaposlenih` u `reservation-fe`
- Predložena komanda:

```bash
./scripts/implement-feature.sh business-membership-invite
```

Obim: autocomplete input komponenta za pretragu korisnika (`GET /auth/users/search`), poziv
`POST /auth/users/notify-membership` odmah nakon `addOwner`/`addEmployee`, bez izmena na
`/businesses/me` pozivnu stranu (kontrakt nepromenjen).
