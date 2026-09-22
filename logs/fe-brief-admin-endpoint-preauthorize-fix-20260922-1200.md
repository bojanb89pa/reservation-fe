# FE brief — Admin endpoint-i sada stvarno zaštićeni (tiket #91, epic #15)

BE tiket: #91 (epic #15 `fix/15-admin-endpoint-i-nisu-zasticeni-preauthorize-se-ne`)
Servisi: `auth-service` i `resource-service`.

**Napomena iz tiketa: "Nema FE zavisnosti — ovo je čisto BE bezbednosna popravka."** Ovaj brief
postoji radi konzistentnosti sa workflow-om, ne zato što je potrebna FE implementacija.

---

## 1. Pregled

Ovo je čisto bezbednosna popravka. **Nijedan ugovor (request/response oblik) nijednog endpointa
nije promenjen.** Promenjeno je samo da li se autorizacija (ROLE_ADMIN) stvarno proverava — ranije
se nije proveravala uopšte (`@PreAuthorize` je bio tiho ignorisan jer `@EnableMethodSecurity` nije
bio uključen), pa je bilo koji ulogovan korisnik mogao da pozove ove rute.

Rute na koje ovo utiče:

- `auth-service`: `POST /auth/users/admin`, `GET /auth/users/search`, `POST /auth/users/notify-membership`
- `resource-service`: `GET/POST /businesses/admin`, `POST /businesses/{id}/activate`,
  `POST /businesses/{id}/reject`, `DELETE /businesses/{id}`

### Posledica za FE

- Ako FE kod igde poziva neku od ovih ruta sa nalogom koji **nije** admin, ranije je (pogrešno)
  dobijao `200`, a sada će dobiti `403 Forbidden`. Proveriti da li postoji takav poziv (npr. iz
  testnog/dev koda ili flow-a koji pretpostavlja da je ruta otvorena) i da UI ispravno prikazuje
  grešku ako do nje dođe.
- Za nalog koji **jeste** admin, ništa se ne menja — odgovor je i dalje `200`/`2xx` istog oblika
  kao pre.
- `POST /auth/users/admin` (kreiranje admin naloga) sada **zahteva da pozivalac već bude admin** —
  self-registration flow (`POST /auth/users/register`) ostaje nepromenjen i i dalje je javan.

---

## 2. Endpointi (bez promene oblika, samo autorizacija sada radi)

Svi zahtevaju `Authorization: Bearer <JWT>` sa `ROLE_ADMIN` u rolama.

| Endpoint | Servis | Napomena |
|---|---|---|
| `POST /users/admin` | auth-service | kreira novi admin nalog |
| `GET /users/search` | auth-service | autocomplete korisnika po emailu/imenu |
| `POST /users/notify-membership` | auth-service | šalje email notifikaciju o business membership-u |
| `GET /businesses/admin` | resource-service | sve poslovnice, bez obzira na status |
| `POST /businesses/admin` | resource-service | kreira biznis u ime korisnika, odmah aktivan |
| `POST /businesses/{id}/activate` | resource-service | aktivira biznis na čekanju |
| `POST /businesses/{id}/reject` | resource-service | odbija biznis na čekanju |
| `DELETE /businesses/{id}` | resource-service | soft-delete biznisa |

---

## 3. TypeScript interfejsi

Nepromenjeni — ne postoje novi DTO-i. Videti postojeće `UserResponse`, `BusinessResponse`,
`UserSummaryResponse` tipove koje FE već koristi za ove rute.

```ts
/** Telo svake greške */
export interface ErrorResponse {
  message: string;
}
```

---

## 4. Greške

| Status | Kada se javlja | Endpoint(i) |
|---|---|---|
| `401` | Nedostaje ili je istekao token | svi navedeni gore |
| `403` | Token je validan, ali nalog nema ROLE_ADMIN — **ovo je novo ponašanje** | svi navedeni gore |

---

## 5. Predlog FE feature-a

Nema potrebe za novim FE feature-om ili implementacionom komandom — nema promene ugovora niti
novog UI-ja. Preporuka: jedan brz smoke-test prolaz kroz admin ekrane (business admin lista,
aktivacija/odbijanje biznisa, kreiranje admin naloga, autocomplete pretraga korisnika, notifikacija
o membership-u) ulogovan kao admin nalog, da se potvrdi da i dalje rade nakon što BE promena stigne
na `main`.
