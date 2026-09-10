# FE brief — slika biznisa (dvofazni upload)

BE tiket: #20 (epic #3, `feature/3-storage-za-biznis-slike`)
Servis: `resource-service`, sve putanje su iza prefiksa `/api` (Traefik `PathPrefix(/api)`, isti host kao FE).

---

## 1. Tok u dva koraka

Create i edit biznisa **ostaju čist JSON**. Fajl se nikad ne šalje uz njih.

1. **Upload** — `POST /api/files` sa `multipart/form-data`. Vraća `uploadId`.
2. **Upotreba** — `uploadId` se šalje kao obično string polje u JSON zahtevu
   (`imageUploadId` pri kreiranju biznisa, `uploadId` pri izmeni slike).

`POST /api/files` je **jedini** multipart endpoint u sistemu. `uploadId` važi 24 sata,
može ga iskoristiti samo korisnik koji je fajl uploadovao, i troši se pri prvoj upotrebi.
Ako korisnik odustane, ništa ne treba raditi — fajl istekne sam.

---

## 2. Endpointi

### `POST /api/files` — upload fajla u privremeni prostor

- Auth: **obavezan** (Bearer token).
- Content-Type: `multipart/form-data`
- Delovi:
  - `file` — binarni sadržaj, obavezan
  - `type` — string, obavezan; trenutno jedina dozvoljena vrednost je `business-image`
- Odgovor: `200 OK`

```json
{
  "uploadId": "tmp/3f1c.../a91b2c...",
  "contentType": "image/png",
  "sizeInBytes": 184320,
  "expiresAt": "2026-09-11T15:14:40"
}
```

### `POST /api/businesses/submit` — korisnik prijavljuje biznis

- Auth: obavezan. Nepromenjeno osim novog opcionog polja `imageUploadId`.

```json
{
  "name": "Salon Ana",
  "location": { "...": "kao i do sada" },
  "imageUploadId": "tmp/3f1c.../a91b2c..."
}
```

- Odgovor `200 OK`: `BusinessResponse` (vidi dole).
- Ako se `imageUploadId` izostavi ili pošalje `null`, ponašanje je identično dosadašnjem.

### `POST /api/businesses/admin` — admin kreira biznis

Isto kao gore, uz postojeće `ownerId`, plus opciono `imageUploadId`.
`uploadId` mora pripadati **adminu koji poziva endpoint**, ne budućem vlasniku biznisa.

### `PUT /api/businesses/{id}/image` — postavi ili zameni sliku

- Auth: obavezan. Telo je JSON, ne multipart.

```json
{ "uploadId": "tmp/3f1c.../a91b2c..." }
```

- Odgovor `200 OK`: ažurirani `BusinessResponse`.

### `DELETE /api/businesses/{id}/image` — ukloni sliku

- Auth: obavezan. Bez tela.
- Odgovor `200 OK`: `BusinessResponse` sa `imageUrl: null`.
- Brisanje slike biznisa koji je nema nije greška.

### `GET /api/businesses/{id}/image` — preuzmi sliku

- Auth: **nije potreban**, endpoint je javan (slika se prikazuje i na pretrazi).
- Odgovor `200 OK`: binarni sadržaj, `Content-Type` je stvarni tip slike,
  `Cache-Control: max-age=3600, public`.
- `404` kada biznis ne postoji ili nema sliku.

Ovaj URL se ne sastavlja ručno na FE — dolazi gotov u `BusinessResponse.imageUrl`.

---

## 3. Promene u postojećim odgovorima

`BusinessResponse` dobija polje `imageUrl`. To je **relativna putanja**
(`/api/businesses/{id}/image`) ili `null` kada biznis nema sliku. Koristi se direktno
kao `src` slike, bez dodavanja hosta.

Endpointi koji su do sada vraćali sirov domenski model biznisa sada vraćaju `BusinessResponse`.
Polja su ista kao i ranije uz dodatak `imageUrl`, pa postojeći kod nastavlja da radi:

- `GET /api/businesses/search`
- `GET /api/businesses/category/{categoryId}`
- `GET /api/businesses/me`
- `GET /api/businesses/admin`
- `GET /api/businesses/{id}`

**Jedna promena ponašanja:** `GET /api/businesses/{id}` za nepostojeći biznis sada vraća
`404`, umesto dosadašnjeg `200` sa praznim telom.

---

## 4. TypeScript interfejsi

```ts
/** Odgovor POST /api/files */
export interface PendingUploadResponse {
  uploadId: string;
  contentType: string;
  sizeInBytes: number;
  /** ISO-8601 lokalno vreme, npr. "2026-09-11T15:14:40" */
  expiresAt: string;
}

/** Vrednost `type` polja pri uploadu */
export type UploadType = 'business-image';

export interface BusinessResponse {
  id: string;
  name: string;
  status: string;
  categoryId: string | null;
  category: BusinessCategoryResponse | null;
  /** Relativna putanja do slike, npr. "/api/businesses/<id>/image"; null kada slike nema */
  imageUrl: string | null;
}

export interface CreateBusinessByUserRequest {
  name: string;
  location: CreateBusinessLocationRequest;
  imageUploadId?: string | null;
}

export interface CreateBusinessBySuperAdminRequest {
  name: string;
  ownerId: string;
  location: CreateBusinessLocationRequest;
  imageUploadId?: string | null;
}

export interface SetBusinessImageRequest {
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
form.append('type', 'business-image');

const res = await http.post<PendingUploadResponse>('/api/files', form);
// zatim: submit({ name, location, imageUploadId: res.uploadId })
```

Ne postavljati `Content-Type` ručno — pusti browser da doda `boundary`.

---

## 5. Greške

Telo svake greške je `{ "message": "..." }`. Poruka je lokalizovana preko `Accept-Language`;
za greške fajlova prevodi još nisu dodati, pa `message` trenutno nosi ključ poruke
(npr. `error.file.too_large`). Raspoznavanje raditi po **HTTP statusu**, ne po tekstu.

| Status | Kada se javlja | Šta prikazati korisniku |
|---|---|---|
| `400` | Fajl je prazan, tip sadržaja nije dozvoljen, ili je `type` nepoznat | „Dozvoljene su JPEG, PNG i WebP slike." |
| `403` | `uploadId` pripada drugom korisniku | „Upload nije pronađen, pokušaj ponovo." |
| `404` (upload) | `uploadId` ne postoji ili je istekao | „Upload je istekao, izaberi sliku ponovo." |
| `404` (biznis) | Biznis ne postoji, ili nema sliku na `GET .../image` | Standardno „nije pronađeno" |
| `413` | Fajl je veći od 5 MB | „Slika sme biti najviše 5 MB." |
| `401` | Nedostaje ili je istekao token | Standardni redirect na login |

Kodovi grešaka na BE strani, radi lakšeg praćenja logova:
`error.file.empty`, `error.file.content_type_unsupported`, `error.file.too_large`,
`error.file.upload_not_found`, `error.file.upload_forbidden`.

---

## 6. Klijentska validacija pre uploada

Proveriti pre slanja, da korisnik ne čeka upload koji će BE odbiti:

- Dozvoljeni tipovi: `image/jpeg`, `image/png`, `image/webp`
- Maksimalna veličina: **5 MB** (5 242 880 bajtova)

BE ponavlja obe provere, pa je klijentska validacija samo radi brzine odziva.
`<input type="file" accept="image/jpeg,image/png,image/webp">`.

---

## 7. Zahtevi za dizajn (iz kontrolnog tiketa #3)

- **Naziv biznisa preko slike.** Naslov ide preko slike, uz gradijent overlay odozdo
  ili senku na tekstu, da kontrast ostane čitljiv i na svetlim slikama.
- **Fiksan aspect ratio** za sve kartice, sa `object-fit: cover`. Slike korisnika dolaze
  u proizvoljnim dimenzijama i ne smeju da razvlače karticu.
- **Fallback kada slike nema.** `imageUrl === null` je normalno stanje, ne greška.
  Prikazati placeholder ili inicijale biznisa u istom aspect ratiju — **bez rupe u layoutu**
  i bez pomeranja ostalih kartica.
- U formi za biznis: pregled izabrane slike pre slanja, mogućnost uklanjanja izbora,
  i jasna poruka o limitu (JPEG/PNG/WebP, do 5 MB).

---

## 8. Predlog FE feature-a

- Naziv: `business-image`
- Grana: `feature/3-storage-za-biznis-slike` u `reservation-fe`
- Predložena komanda:

```bash
./scripts/implement-feature.sh business-image
```

Obim: `FileApiRepository.upload` (multipart), proširenje `BusinessApiRepository.submit`
poljem `imageUploadId`, komponenta za izbor i pregled slike, prikaz `imageUrl` sa
fallbackom na karticama i na stranici biznisa, i akcije za zamenu i uklanjanje slike
na stranici za izmenu biznisa.
