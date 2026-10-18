# FE brief — #228: admin isključuje/uključuje partnera (client application)

## Endpoint (novi)
- `PATCH /admin/client-applications/{id}` — samo `ROLE_ADMIN`
- Request body: `{ "enabled": false }`
- Response `200`: `ClientApplicationResponse` (isti oblik kao u `GET /admin/client-applications`)

## TypeScript
```ts
export interface SetClientApplicationEnabledRequest {
  enabled: boolean;
}

export interface ClientApplicationResponse {
  id: string;
  name: string;
  scope: ClientApplicationScope;
  enabled: boolean;
}
```

## Greške
- `400` — nedostaje `enabled`
- `401` — nedostaje ili je nevalidan token
- `403` — pozivalac nije admin
- `404` — partner ne postoji (`CLIENT_APPLICATION_NOT_FOUND`)

## FE implementacija
- domain: `setClientApplicationEnabled(id, enabled)`
- infrastructure: `PATCH /admin/client-applications/{id}` sa `{ enabled }`
- ui: u admin listi/detalju partnera prekidač uključen/isključen sa potvrdom; nakon uspeha osvežiti red iz odgovora

## Predlog
- Feature naziv: `admin-partner-enable-toggle`
- Komanda: `./scripts/implement-feature.sh frontend admin-partner-enable-toggle`
