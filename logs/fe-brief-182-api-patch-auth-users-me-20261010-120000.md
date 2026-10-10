# FE brief — #182 PATCH /auth/users/me: korisnik menja svoje ime i prezime

## Endpoint

`PATCH /auth/users/me` (auth: Bearer JWT; ciljni korisnik je uvek vlasnik tokena — id se ne šalje)

Request body:

```json
{ "firstName": "Jane", "lastName": "Doe" }
```

Response 200: `UserResponse` (ažurirani korisnik, isti oblik kao `PUT/DELETE /auth/users/me/profile-picture`).

## TypeScript

```ts
interface UpdateOwnProfileRequest {
  firstName: string; // obavezno, ne sme biti prazno ni samo razmaci
  lastName: string;  // obavezno, ne sme biti prazno ni samo razmaci
}

interface UserResponse {
  id: string | null;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  enabled: boolean | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  profilePictureUrl: string | null;
}
```

## Greške

- 400 — `firstName`/`lastName` nedostaje, prazan ili samo razmaci (`{ "message": "field: razlog" }`)
- 401 — nema važećeg tokena
- 404 — ulogovani korisnik ne postoji
- 422 — domen odbio ime (`{ "message": "..." }`)

## Predlog za FE

- Feature: `profil-izmena-imena`
- Forma na stranici profila sa poljima ime/prezime; ne slati email, role ni id. Posle 200 osvežiti keširanog korisnika iz odgovora.
- Predlog komande: `./scripts/implement-feature.sh <fe-repo> profil-izmena-imena`
