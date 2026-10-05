# FE brief — #154: `SearchResultResponse` vraća `imageUrl` biznisa

## Endpoint (izmenjen)
- `GET /v1/search?q=<string>&city=<string>&page=0&size=20`
- Request body: nema
- Response `200`: `PageResponse<SearchResultResponse>`
- Novo polje: `imageUrl` — relativna putanja `/api/businesses/{businessId}/image` kada biznis ima sliku, inače `null`.

## TypeScript
```ts
export interface SearchResultResponse {
  businessId: string;
  businessName: string;
  categoryId: string | null;
  city: string | null;
  similarityScore: number;
  imageUrl: string | null; // NOVO
}
```

## Greške
- `400` — nevalidni parametri / fallback
- `401` — nedostaje ili je nevalidan token

## FE implementacija
- domain: dodati `imageUrl: string | null` u search result model
- infrastructure: `imageUrl` proći kroz `resolveApiUrl` (putanja je relativna)
- ui: kartica rezultata na `/search` prikazuje `BusinessImage` (fallback kada je `null`)

## Predlog
- Feature naziv: `search-result-business-image`
- Komanda: `./scripts/implement-feature.sh frontend search-result-business-image`
