export const env = {
  authBaseUrl: import.meta.env['VITE_AUTH_BASE_URL'] as string,
  resourceBaseUrl: import.meta.env['VITE_RESOURCE_BASE_URL'] as string,
  oauthClientId: import.meta.env['VITE_OAUTH_CLIENT_ID'] as string,
  oauthClientSecret: import.meta.env['VITE_OAUTH_CLIENT_SECRET'] as string,
  oauthRedirectUri: import.meta.env['VITE_OAUTH_REDIRECT_URI'] as string,
} as const;
