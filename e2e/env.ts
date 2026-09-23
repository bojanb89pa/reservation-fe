/**
 * Adrese i kredencijali za E2E, na jednom mestu. Podrazumevane vrednosti
 * odgovaraju `compose.e2e.yml` + `yarn preview` u `.github/workflows/e2e.yml`.
 *
 * `auth-service` mora da se vidi pod ISTIM imenom i iz browsera i iz
 * `resource-service` kontejnera, jer je to `issuer` u tokenu. Zato CI dodaje
 * `127.0.0.1 auth-service` u /etc/hosts runnera.
 */
function read(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

export const env = {
  /** FE (vite preview u CI-ju, ili staging). */
  baseUrl: read('E2E_BASE_URL', 'http://localhost:5173'),
  /** auth-service, sa context path-om `/auth`. */
  authUrl: read('E2E_AUTH_URL', 'http://auth-service:8081/auth'),
  /** resource-service, sa context path-om `/api`. */
  apiUrl: read('E2E_API_URL', 'http://localhost:8080/api'),
  /** Mailpit HTTP API (aktivacioni mejlovi). Na staging-u ga nema. */
  mailpitUrl: read('E2E_MAILPIT_URL', 'http://localhost:8025'),

  oauthClientId: read('E2E_OAUTH_CLIENT_ID', 'reservation'),
  oauthClientSecret: read('E2E_OAUTH_CLIENT_SECRET', 'e2e-secret'),
  oauthRedirectUri: read('E2E_OAUTH_REDIRECT_URI', 'http://localhost:5173/callback'),

  /** Admin iz bootstrap-a (ADMIN_BOOTSTRAP_*). Nikad lični admin (id 1). */
  adminEmail: read('E2E_ADMIN_EMAIL', 'seed-admin@demo.reserva.test'),
  adminPassword: read('E2E_ADMIN_PASSWORD', ''),
  /** Lozinka za naloge koje testovi sami prave. */
  userPassword: read('E2E_USER_PASSWORD', 'E2e-Passw0rd!'),
} as const;
