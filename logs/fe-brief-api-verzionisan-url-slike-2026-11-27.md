# FE brief: versioned image URLs (#345, parent #342)

## Endpoints changed (response only, no request changes)
- Business responses (`BusinessResponse`, `NearbyBusinessResponse`): `imageUrl` is now
  `/api/businesses/{id}/image?v=<epochMillis>` or `null` when the business has no image.
- `GET /auth/users/...` / user responses (`UserResponse`): `profilePictureUrl` is now
  `/auth/users/{id}/profile-picture?v=<epochMillis>` or `null`.
- Search results (`SearchResultResponse.imageUrl`) are NOT versioned yet (`/api/businesses/{id}/image`), because the search read model has no upload time.
- `GET /api/businesses/{id}/image` and `GET /auth/users/{id}/profile-picture` are unchanged and ignore `v`.

## TypeScript
```ts
interface BusinessResponse { imageUrl: string | null; /* ... */ }
interface NearbyBusinessResponse { imageUrl: string | null; /* ... */ }
interface UserResponse { profilePictureUrl: string | null; /* ... */ }
```
Use the URL as-is (do not strip or append query params). After an image replace, the response carries a new `v`, so the browser fetches the new image.

## Errors
No new error codes.

## FE work
- Delete the `WARNING` comment in `BusinessImageSection.tsx:65` (layer:ui). Nothing else.
- Suggested feature name: `versioned-image-urls-cleanup`.
