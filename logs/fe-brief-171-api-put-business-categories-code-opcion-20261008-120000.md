# FE brief — #171 PUT /business-categories/{id}: opcioni `code`

## Endpoint

`PUT /business-categories/{id}` (auth: Bearer JWT, kao i do sada)

Request body:

```json
{ "translations": { "en": "Salon", "sr": "Salon" } }
```

`code` se može izostaviti (ili poslati `null`) — postojeći code kategorije ostaje nepromenjen.
`parentId` se ponaša kao i pre (null = bez roditelja).

Response 200: `BusinessCategoryResponse`.

## TypeScript

```ts
interface UpdateBusinessCategoryRequest {
  code?: string | null;            // opcion; ako je poslat, ne sme biti prazan ni blank
  parentId?: string | null;
  translations: Record<string, string>; // ne sme biti prazan
}

interface BusinessCategoryResponse {
  id: string;
  name: string;
  parentId: string | null;
  symbol: string | null;
  color: string | null;
}
```

## Greške

- 400 — `code` je prazan/blank string, ili `translations` prazan (`{ "message": "field: razlog" }`)
- 404 — kategorija ne postoji
- 409 — druga kategorija već koristi novi code
- 422 — kategorija ne može biti sama sebi roditelj

## Predlog za FE

- Feature: `admin-kategorije-izmena-bez-code-a`
- Forma za izmenu kategorije ne mora da šalje `code`; ne slati `""` (vraća 400) — izostaviti polje ili poslati `null`.
- Predlog komande: `./scripts/implement-feature.sh <fe-repo> admin-kategorije-izmena-bez-code-a`
