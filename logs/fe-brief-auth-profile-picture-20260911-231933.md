# FE brief — profilna slika korisnika + batch lookup korisnika

BE tiket: #37 (epic #4/#33, `feature/4-upload-profilne-slike`)
Servis: `auth-service`, sve putanje su iza prefiksa `/auth` (isti host kao FE, drugačiji prefiks od `/api` koji koristi `resource-service`).

---

## 1. Tok u dva koraka (isti princip kao kod slike biznisa)

1. **Upload** — `POST /auth/users/files` sa `multipart/form-data`. Vraća `uploadId`.
2. **Upotreba** — `uploadId` se šalje kao obično string polje u JSON zahtevu
   (`uploadId` pri PUT-u profilne slike).

`uploadId` važi ograničeno vreme, može ga iskoristiti samo korisnik koji je fajl uploadovao
(mora biti ulogovan — Bearer token), i troši se pri prvoj upotrebi.

**Važno ograničenje:** `POST /auth/users/files` zahteva validan Bearer token. To znači da
se **profilna slika NE MOŽE poslati tokom same registracije** (u tom trenutku korisnik još
nema nalog ni token) — polje `profilePictureUploadId` postoji na `RegisterUserRequest` radi
kompatibilnosti oblika, ali ga BE trenutno **ignoriše** na `POST /auth/users/register`. Ne
prikazivati opciju "dodaj sliku" na formi za registraciju dok se ovo ne razreši na BE strani;
slika se može dodati tek posle registracije i aktivacije naloga, kroz `PUT /auth/users/me/profile-picture`.

---

## 2. Endpointi

### `POST /auth/users/files` — upload fajla u privremeni prostor

- Auth: **obavezan** (Bearer token).
- Content-Type: `multipart/form-data`
- Delovi:
  - `file` — binarni sadržaj, obavezan
  - `type` — string, obavezan; trenutno jedina dozvoljena vrednost je `profile-picture`
- Odgovor: `200 OK`

```json
{
  "uploadId": "tmp/3f1c.../a91b2c...",
  "contentType": "image/png",
  "sizeInBytes": 184320,
  "expiresAt": "2026-09-11T23:19:33"
}
```

### `PUT /auth/users/me/profile-picture` — postavi ili zameni profilnu sliku

- Auth: obavezan. Telo je JSON, ne multipart.

```json
{ "uploadId": "tmp/3f1c.../a91b2c..." }
```

- Odgovor `200 OK`: ažurirani `UserResponse`.

### `DELETE /auth/users/me/profile-picture` — ukloni profilnu sliku

- Auth: obavezan. Bez tela.
- Odgovor `200 OK`: `UserResponse` sa `profilePictureUrl: null`.
- Brisanje slike korisnika koji je nema nije greška.

### `GET /auth/users/{id}/profile-picture` — preuzmi profilnu sliku po ID-u korisnika

- Auth: obavezan (Bearer token), ali **bilo koji ulogovan korisnik** može preuzeti sliku
  bilo kog drugog korisnika — nema provere vlasništva (slika ide uz ime, javna je unutar app-a).
- Odgovor `200 OK`: binarni sadržaj, `Content-Type` je stvarni tip slike,
  `Cache-Control: max-age=3600, public`.
- `404` kada korisnik ne postoji ili nema sliku.

Ovaj URL se ne sastavlja ručno na FE — dolazi gotov u `UserResponse.profilePictureUrl`.

### `GET /auth/users/batch?ids=<id1>,<id2>,...` — razreši više korisnika odjednom

- Auth: obavezan.
- **Ovo je endpoint koji FE koristi da razreši `userId` reference koje stižu iz
  `resource-service`** (npr. `BusinessMembershipResponse.userId`, `ReservationResponse.userId`)
  u ime + sliku, umesto prikazivanja sirovog ID-a. `resource-service` ne zove `auth-service`
  preko mreže — to rešava FE, jednim pozivom ovog endpointa nad skupom ID-jeva.
- Odgovor `200 OK`: niz `UserResponse`. Nepoznati ID-jevi se jednostavno izostavljaju iz
  odgovora (niz može biti kraći od poslatog broja ID-jeva) — nema `404` za pojedinačne ID-jeve.

```json
[
  { "id": "...", "firstName": "Ana", "lastName": "Anić", "profilePictureUrl": "/auth/users/.../profile-picture", "email": "...", "roles": ["ROLE_USER"], "enabled": true }
]
```

---

## 3. Promene u postojećim odgovorima

`UserResponse` dobija polje `profilePictureUrl`. To je **relativna putanja**
(`/auth/users/{id}/profile-picture`) ili `null` kada korisnik nema sliku. Koristi se direktno
kao `src` slike, bez dodavanja hosta. Ovo utiče na sve postojeće endpointe koji vraćaju
`UserResponse`: `POST /auth/users/register`, `POST /auth/users/admin`,
`POST /auth/users/google-sign-in`, `GET /auth/users`, `GET /auth/users/all`.

`RegisterUserRequest` (koristi ga i `POST /auth/users/register` i `POST /auth/users/admin`)
dobija opciono polje `profilePictureUploadId`. **Trenutno se ne obrađuje ni na jednom od ta
dva endpointa** (BE napomena — videti odeljak 1). Polje se sme slati, ali nema efekta.

---

## 4. TypeScript interfejsi

```ts
/** Odgovor POST /auth/users/files */
export interface PendingUploadResponse {
  uploadId: string;
  contentType: string;
  sizeInBytes: number;
  /** ISO-8601 lokalno vreme, npr. "2026-09-11T23:19:33" */
  expiresAt: string;
}

/** Vrednost `type` polja pri uploadu */
export type UploadType = 'profile-picture';

export interface UserResponse {
  id: string | null;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  enabled: boolean | null;
  /** Relativna putanja do slike, npr. "/auth/users/<id>/profile-picture"; null kada slike nema */
  profilePictureUrl: string | null;
}

export interface RegisterUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Trenutno bez efekta na BE — ne prikazivati na formi za registraciju, videti odeljak 1 */
  profilePictureUploadId?: string | null;
}

export interface SetProfilePictureRequest {
  uploadId: string;
}

/** Telo svake greške */
export interface ErrorResponse {
  message: string;
}
```

Primer upload poziva:

```ts
const form = new FormData();
form.append('file', file);
form.append('type', 'profile-picture');

const res = await http.post<PendingUploadResponse>('/auth/users/files', form);
// zatim: http.put('/auth/users/me/profile-picture', { uploadId: res.uploadId })
```

Primer batch lookup-a (npr. za listu rezervacija):

```ts
const ids = [...new Set(reservations.map(r => r.userId))];
const users = await http.get<UserResponse[]>(`/auth/users/batch?ids=${ids.join(',')}`);
const byId = new Map(users.map(u => [u.id, u]));
```

Ne postavljati `Content-Type` ručno na upload poziv — pusti browser da doda `boundary`.

---

## 5. Greške

Telo svake greške je `{ "message": "..." }`. Raspoznavanje raditi po **HTTP statusu**, ne po tekstu
(prevodi za `error.file.*` poruke još nisu dodati, `message` trenutno nosi ključ poruke).

| Status | Kada se javlja | Šta prikazati korisniku |
|---|---|---|
| `400` | Fajl je prazan, tip sadržaja nije dozvoljen, ili je `type` nepoznat | „Dozvoljene su JPEG, PNG i WebP slike." |
| `401` | Nedostaje ili je istekao token | Standardni redirect na login |
| `403` | `uploadId` pripada drugom korisniku | „Upload nije pronađen, pokušaj ponovo." |
| `404` (upload) | `uploadId` ne postoji ili je istekao | „Upload je istekao, izaberi sliku ponovo." |
| `404` (korisnik/slika) | Korisnik ne postoji, ili nema sliku na `GET .../profile-picture` | Standardno „nije pronađeno" |
| `413` | Fajl je veći od 10 MB | „Slika sme biti najviše 10 MB." |

Kodovi grešaka na BE strani, radi lakšeg praćenja logova:
`error.file.empty`, `error.file.content_type_unsupported`, `error.file.too_large`,
`error.file.upload_not_found`, `error.file.upload_forbidden`.

---

## 6. Klijentska validacija pre uploada

Proveriti pre slanja, da korisnik ne čeka upload koji će BE odbiti:

- Dozvoljeni tipovi: `image/jpeg`, `image/png`, `image/webp`
- Maksimalna veličina: **10 MB** (10 485 760 bajtova)

BE ponavlja obe provere, pa je klijentska validacija samo radi brzine odziva.
`<input type="file" accept="image/jpeg,image/png,image/webp">`.

> Napomena za BE/infra: `auth-service`-ov `application.yml` trenutno nema podešen
> `spring.servlet.multipart.max-file-size` (Spring Boot default je 1MB), što je ispod ovog
> 10MB limita — van dometa ovog (api-layer) tiketa, ali treba proveriti pre nego što FE
> počne da testira upload slika većih od ~1MB.

---

## 7. Zahtevi za dizajn

- **Avatar korisnika svuda gde se do sada prikazivao sirov `userId`** — liste zaposlenih/vlasnika
  biznisa, prikaz rezervacija, profil naloga. Koristiti `firstName + lastName` i
  `profilePictureUrl` iz batch lookup-a ili iz `UserResponse` na sopstvenom profilu.
- **Fallback kada slike nema.** `profilePictureUrl === null` je normalno stanje, ne greška —
  prikazati inicijale (`firstName[0] + lastName[0]`) u krugu, konzistentnog prečnika svuda gde
  se avatar pojavljuje.
- Na stranici naloga: pregled trenutne slike, dugme za zamenu (bira fajl → upload → PUT) i
  dugme za uklanjanje, sa jasnom porukom o limitu (JPEG/PNG/WebP, do 10 MB).

---

## 8. Predlog FE feature-a

- Naziv: `user-profile-picture`
- Grana: `feature/4-upload-profilne-slike` u `reservation-fe`
- Predložena komanda:

```bash
./scripts/implement-feature.sh user-profile-picture
```

Obim: `FileApiRepository.upload` (multipart, deljeno sa `auth-service` baznim URL-om),
`UserApiRepository.setProfilePicture` / `.deleteProfilePicture` / `.getUsersByIds`, avatar
komponenta sa fallbackom na inicijale, zamena prikaza sirovog `userId` avatarom+imenom na
listama zaposlenih/vlasnika biznisa i rezervacija (koristeći batch lookup), i sekcija za
upravljanje profilnom slikom na stranici naloga.
