// SAMO ZA E2E TESTOVE. Generiše RSA par ključeva za test OIDC izdavaoca
// (`oidc-issuer` u compose.e2e.yml). Ključevi se ne čuvaju u repou i ne koriste
// se nigde van E2E okruženja (`.github/workflows/e2e.yml` ovo pokreće pre
// `docker compose up`).
//
//   private/test-private-key.pem  — kojim fixture potpisuje ID tokene (gitignore)
//   www/jwks.json                 — javni deo sa `kid`, servira ga oidc-issuer (gitignore)
//   www/.well-known/openid-configuration — discovery dokument
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ISSUER = process.env.E2E_OIDC_ISSUER ?? 'http://oidc-issuer:8090';
export const KID = 'e2e-test-key-1';

const root = dirname(fileURLToPath(import.meta.url));
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });

mkdirSync(join(root, 'private'), { recursive: true });
mkdirSync(join(root, 'www', '.well-known'), { recursive: true });
writeFileSync(join(root, 'private', 'test-private-key.pem'), privateKey.export({ type: 'pkcs8', format: 'pem' }));
writeFileSync(
  join(root, 'www', 'jwks.json'),
  `${JSON.stringify({ keys: [{ kty: 'RSA', use: 'sig', alg: 'RS256', kid: KID, n: jwk.n, e: jwk.e }] }, null, 2)}\n`,
);
writeFileSync(
  join(root, 'www', '.well-known', 'openid-configuration'),
  `${JSON.stringify(
    {
      issuer: ISSUER,
      jwks_uri: `${ISSUER}/jwks.json`,
      response_types_supported: ['id_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
    },
    null,
    2,
  )}\n`,
);
console.log(`oidc-issuer: ključevi generisani (kid=${KID}, issuer=${ISSUER})`);
