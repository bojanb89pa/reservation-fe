# FE brief: search autocomplete suggestions (#209, parent #205)

## Endpoint

`GET /v1/search/suggestions?q=<text>&lang=<locale>` (public, no auth; served under the service context path like `/v1/search`)

- `q` (required): text typed by the user. Blank → `200 []`.
- `lang` (optional): BCP 47 tag for category names. If omitted, the `Accept-Language` header is used, then `en`.
- No request body. Max number of items is server-configured (`search.suggestions.max-results`, default 10).

## TypeScript

```ts
type SearchSuggestionType = 'PLACE' | 'CATEGORY' | 'BUSINESS';

interface SearchSuggestionResponse {
  type: SearchSuggestionType;
  id: string;   // PLACE: city name (not a UUID); CATEGORY / BUSINESS: UUID
  name: string; // display text; category names are localized
}

// response body: SearchSuggestionResponse[]
```

## Ordering

The server order must be preserved: all `PLACE` items first, then `CATEGORY`, then `BUSINESS`. Within a group, word-start matches rank above mid-word matches. Do not re-sort; render group headers from `type` if desired.

## Using a selection

- `PLACE` → run `GET /v1/search?q=...&city=<id>` (id is the city name).
- `CATEGORY` → navigate to the category (id = category UUID).
- `BUSINESS` → navigate to the business (id = business UUID).

## Errors

- `200` with `[]` for blank/no matches.
- `400` if `q` is missing.

## Suggested FE feature

Name: `search-autocomplete`. Debounce input (~250 ms), cancel in-flight requests, skip calls for blank input.
Command: `./scripts/implement-feature.sh <fe-service> search-autocomplete`
