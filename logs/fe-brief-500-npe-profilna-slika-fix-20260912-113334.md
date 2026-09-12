# FE brief — fix za 500 (NPE) na profilnoj slici

BE tiket: #42 (epic #5, `fix/5-500-na-post-auth-users-files-pri-postavljanju-prof`)
Servis: `auth-service`. **Ovo je isključivo bugfix, bez izmene API kontrakta.** Endpointi, DTO
oblici i greške ostaju identični onima opisanim u
`fe-brief-auth-profile-picture-20260911-231933.md` (originalni brief za PR #41).

---

## 1. Šta je bilo pokvareno

Tri endpointa u `auth-service` su vraćala **500** za svaki poziv sa validnim Bearer tokenom,
umesto očekivanog odgovora:

- `POST /auth/users/files`
- `PUT /auth/users/me/profile-picture`
- `DELETE /auth/users/me/profile-picture`

Uzrok: `auth-service`-ova bezbednosna konfiguracija nije imala JWT→`AuthenticatedUser`
konverter, pa je `@AuthenticationPrincipal authUser` u kontrolerima uvek bio `null` →
`NullPointerException` → 500. Fajlovi koje FE poziva i njihovi formati zahteva/odgovora
nisu menjani.

## 2. Šta je popravljeno

Dodat je `JwtToUserConverter` u `auth-service` (isti princip koji `resource-service` već
koristi) i povezan u `ApiServerSecurityConfig`, tako da se JWT principal ispravno pretvara u
`AuthenticatedUser` pre nego što stigne do kontrolera.

- `POST /auth/users/files`, `PUT /auth/users/me/profile-picture` i
  `DELETE /auth/users/me/profile-picture` sada rade sa validnim Bearer tokenom (nema više 500).
- Nepostojanje/nevalidnost tokena i dalje vraća `401`/`403`, kao i pre.

## 3. Akcija na FE strani

**Nema potrebe za izmenom koda na FE strani.** Ako je FE tok za upload/izmenu/brisanje
profilne slike implementiran prema `fe-brief-auth-profile-picture-20260911-231933.md`, samo
treba ponovo testirati taj tok (koraci iz tiketa: Moj nalog → Profilna slika → izabrati sliku
→ "Postavi sliku") i potvrditi da poziv sada vraća `200 OK` sa ažuriranim `UserResponse`
umesto `500`.

Za tačan oblik zahteva/odgovora, TypeScript interfejse i tabelu grešaka, videti postojeći
`fe-brief-auth-profile-picture-20260911-231933.md` — ništa od toga se nije promenilo ovim
tiketom.

## 4. Predlog

Nije potreban novi FE feature/grana za ovaj tiket — reč je o regresionom retestu postojeće
funkcionalnosti iz `feature/4-upload-profilne-slike`. Ako je taj FE feature već implementiran
i čeka na ovaj BE fix, dovoljno je ponovo pokrenuti manuelni test iznad (ili postojeće
end-to-end testove ako postoje) nakon merge-a ovog PR-a.
