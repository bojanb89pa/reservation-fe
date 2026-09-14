# FE brief — Autorizacija addOwner/addEmployee (tiket #77, parent #74)

BE tiket: #77 (parent #74, epic #13 `fix/13-dodavanje-vlasnika-i-korisnika-na-biznis`)
Servis: `resource-service` (bez prefiksa, `/api` po postojećoj konvenciji frontenda).

---

## 1. Pregled

**Ugovor (request/response oblik) na `POST /businesses/{businessId}/owners` i
`POST /businesses/{businessId}/employees` je nepromenjen** — i dalje se šalje `{ "email": "..." }`,
i dalje se dobija `BusinessMembershipResponse`. Ovaj tiket menja samo **ko sme da pozove** ove
endpointe i **šta odgovor 200 znači**.

**Bitna promena u odnosu na raniji brief ([fe-brief-business-membership-invite](fe-brief-business-membership-invite-20260913-101720.md)):**
tamo je pisalo da su `addOwner`/`addEmployee` ograničeni na `ROLE_ADMIN` (isto kao
`/auth/users/search` i `/auth/users/notify-membership`). **To više ne važi.** Od ovog tiketa:

- Endpointe sme da pozove **admin ILI postojeći owner tog istog biznisa** (zaposleni ne sme).
- Kontrola pristupa se ne vidi kroz HTTP status — **ne postoji više `403` za ove dve rute.**
- Ako pozivalac nije ovlašćen (npr. zaposleni, ili owner nekog drugog biznisa, ili običan
  korisnik), BE **svejedno vraća `200 OK` sa `BusinessMembershipResponse` istog oblika** kao pri
  uspehu — namerno, da se spreči enumeracija naloga/dozvola. **Taj 200 odgovor ne garantuje da je
  članstvo stvarno upisano.** FE ne može da razlikuje "stvarno dodato" od "tiho odbijeno" na osnovu
  odgovora ovog poziva.

### Posledica za FE dizajn

- Ako forma za dodavanje vlasnika/zaposlenog treba da bude dostupna i ne-admin korisnicima (npr.
  vlasniku biznisa iz njegovog admin panela biznisa), **sada je to podržano** — ranije nije bilo.
- Ne prikazivati generičku poruku uspeha kao potvrdu da je osoba zaista dodata u tim biznisu, ako
  postoji rizik da je pozivalac neovlašćen (npr. ako FE dozvoljava poziv i zaposlenima). Za tačnu
  potvrdu, FE treba posle ovog poziva da učita listu vlasnika/zaposlenih
  (`GET /businesses/{businessId}/owners` ili `/employees`) i proveri da li se email/nalog zaista
  pojavio, ako UI treba da bude pouzdan po tom pitanju.
- `409 Conflict` (već postojeći vlasnik/zaposleni) i `404` (biznis ne postoji) i dalje važe **samo
  kada je pozivalac ovlašćen** — neovlašćeni pozivalac nikad ne dobija ni `409` ni `404`, samo `200`.

---

## 2. Endpointi (bez promene oblika, promenjena autorizacija/semantika)

### `POST /businesses/{businessId}/owners`

- Telo: `{ "email": "string" }`
- Ko sme: admin ili postojeći owner biznisa `businessId`. Zaposleni ne sme.
- Odgovor `200 OK`: `BusinessMembershipResponse` — **uvek**, bez obzira da li je pozivalac
  ovlašćen.

### `POST /businesses/{businessId}/employees`

- Telo: `{ "email": "string" }`
- Ko sme: admin ili postojeći owner biznisa `businessId`. Zaposleni ne sme (ni sebe ni druge).
- Odgovor `200 OK`: `BusinessMembershipResponse` — **uvek**, bez obzira da li je pozivalac
  ovlašćen.

---

## 3. TypeScript interfejsi (nepromenjeni)

```ts
export interface AddMemberRequest {
  email: string;
}

export interface BusinessMembershipResponse {
  id: string;
  businessId: string;
  userId: string | null;
  email: string | null;
  role: 'OWNER' | 'EMPLOYEE';
}

/** Telo svake greške */
export interface ErrorResponse {
  message: string;
}
```

---

## 4. Greške

| Status | Kada se javlja | Endpoint(i) |
|---|---|---|
| `404` | Biznis `businessId` ne postoji | oba |
| `409` | Email je već vlasnik/zaposleni tog biznisa — **samo kada je pozivalac ovlašćen** | oba |
| `401` | Nedostaje ili je istekao token | oba |

**Nema više `403` na ovim endpointima.** Neovlašćen pozivalac dobija `200` sa istim oblikom
odgovora kao ovlašćen — FE ne treba da tretira `200` kao siguran dokaz da je operacija stvarno
izvršena ako postoji sumnja da pozivalac nije admin/owner.

---

## 5. Predlog FE feature-a

- Naziv: `business-owner-employee-authz`
- Grana: `fix/13-dodavanje-vlasnika-i-korisnika-na-biznis` u `reservation-fe`
- Predložena komanda:

```bash
./scripts/implement-feature.sh business-owner-employee-authz
```

Obim: ažurirati formu za dodavanje vlasnika/zaposlenog da bude dostupna i vlasnicima biznisa (ne
samo adminu), i po potrebi dodati potvrdu preko liste vlasnika/zaposlenih nakon poziva umesto
oslanjanja na `200` odgovor kao garanciju uspeha.
