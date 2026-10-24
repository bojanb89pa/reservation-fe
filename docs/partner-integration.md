# Partner integration guide: Reserva widget

This guide is for a partner who embeds the Reserva booking widget on their website. The contract is defined by the loader's source comment (`apps/widget/src/loader/widgetLoader.ts`) and by the `WidgetMountOptions` and `WidgetMessage` types in `@fe/domain`. If this guide and the code disagree, the code wins.

For a short overview, see the [README](../README.md#embedding-the-widget). For the full widget reference, see [widget.md](widget.md).

## 1. What a partner gets from Reserva

- **Client application**: the partner's registration in Reserva.
- **`clientId`**: the public identifier of the client application. It is not a secret and goes into the page code.
- **`allowed_origins`**: the list of exact origins (for example `https://partner-site.example`) allowed to embed the widget. The widget sends messages only to a page origin on this list.
- **Business consent per location**: the widget works only for locations of businesses that have approved consent for the partner.

When the widget cannot be used, the loader calls `onUnavailable({ reason })`:

| `reason`                | Meaning                                                  |
| ----------------------- | -------------------------------------------------------- |
| `LOCATION_OUT_OF_SCOPE` | The location does not belong to this partner.            |
| `CONSENT_NOT_APPROVED`  | The business has not approved consent for this location. |
| `PARTNER_DISABLED`      | A Reserva admin has disabled the partner.                |

In that case the partner should show a fallback option, for example a contact phone number.

## 2. Loader installation

```html
<div id="reserva-widget"></div>
<script>
  window.ReservaWidget = window.ReservaWidget || [];
  window.ReservaWidget.push([
    'mount',
    '#reserva-widget',
    {
      clientId: '<public client application id>',
      locationId: '<location id>',
      theme: 'light', // required: 'light' | 'dark' (without it nothing is drawn)
      locale: 'sr', // optional: 'sr' | 'en' (default 'sr')
      // string | null | Promise<string | null>; null means guest
      getIdentityToken: () => myAuth.getIdentityToken(),
      // { id, status, startTime, endTime, locationName }
      onReservationCreated: (reservation) => {
        console.log('Reservation created', reservation.id);
      },
      onUnavailable: ({ reason }) => {
        // 'LOCATION_OUT_OF_SCOPE' | 'CONSENT_NOT_APPROVED' | 'PARTNER_DISABLED'
        document.querySelector('#reserva-widget').textContent = 'Booking is currently unavailable.';
      },
    },
  ]);
</script>
<script async src="https://<reserva origin>/widget.js"></script>
```

The required fields are `clientId`, `locationId` and `getIdentityToken`. Without them, `mount` logs an error to the console and renders nothing.

Commands are placed in the `window.ReservaWidget` queue before the script loads, and they run in order. After the script loads, `push` runs them immediately.

- `['mount', selector, options]` renders the iframe into the first element that matches `selector`.
- `['refreshIdentity', selector?]` calls `getIdentityToken()` again and sends the widget a new identity. Without a selector, it applies to all widgets. It is also available as `window.ReservaWidget.refreshIdentity(selector?)`.

- `['setTheme', theme, selector?]` switches the widget between `'light'` and `'dark'` without a reload; the chosen slot is kept. Without a selector it applies to all widgets. It is also available as `window.ReservaWidget.setTheme(theme, selector?)`. The loader sends the iframe a `reserva:theme` message (`{ v, type, theme }`). The widget never follows the system color scheme: pass the theme of your own site and call `setTheme` when your site's theme changes.

**Call `refreshIdentity` after every login and logout** of a user on your site:

```js
function onAuthChanged() {
  window.ReservaWidget.push(['refreshIdentity']);
}
```

The Reserva token in the widget lasts about 10 minutes and cannot be refreshed. When it expires, the widget asks for an identity again, and the loader calls `getIdentityToken()`. That function must therefore always return a fresh, unused token, or `null`.

A guest (`null`) sees the available slots and can pick one. Clicking "Reserve" makes the widget remember the choice and send `reserva:sign-in-required`, and the loader calls the optional `onSignInRequired()`. Open your sign-in there, then call `ReservaWidget.refreshIdentity()`: the widget completes the reservation without a second choice. Without `onSignInRequired` the widget asks the guest to sign in on your site.

## 3. Path 1: a trusted OIDC issuer (for example Google)

If your users sign in through a trusted OIDC issuer, pass that issuer's ID token directly through `getIdentityToken`. No backend is needed.

Example with Google Identity Services, as on the demo site (`apps/demo-partner`):

```html
<script src="https://accounts.google.com/gsi/client" async></script>
<div id="google-login"></div>
<script>
  let idToken = null;

  window.addEventListener('load', () => {
    google.accounts.id.initialize({
      client_id: '<your Google OAuth client id>',
      callback: ({ credential }) => {
        idToken = credential; // the ID token stays in memory
        window.ReservaWidget.push(['refreshIdentity']);
      },
    });
    google.accounts.id.renderButton(document.getElementById('google-login'), {
      type: 'standard',
      theme: 'outline',
      text: 'signin_with',
    });
  });

  function signOut() {
    idToken = null;
    google.accounts.id.disableAutoSelect();
    window.ReservaWidget.push(['refreshIdentity']);
  }

  function getIdentityToken() {
    if (!idToken) return null;
    const payload = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return exp * 1000 > Date.now() ? idToken : null; // an expired token is treated as a guest
  }

  window.ReservaWidget = window.ReservaWidget || [];
  window.ReservaWidget.push([
    'mount',
    '#reserva-widget',
    {
      clientId: '<public client application id>',
      locationId: '<location id>',
      getIdentityToken,
    },
  ]);
</script>
```

Note: the token decoding in this example is only for checking expiry. Reserva verifies the signature.

## 4. Path 2: the partner has a backend and signs the assertion

A partner with its own backend signs a short-lived JWT assertion about its signed-in user. The front end gets that token from your backend and returns it through `getIdentityToken`. Reserva verifies the signature with your public key, so you do not need an OIDC issuer.

### Key registration

A Reserva administrator adds a trusted issuer of type `PARTNER_KEY` to the partner integration:

- `issuer`: your identifier (a URL or an opaque ID, without spaces). It is the `iss` in every assertion.
- Public key, **exactly one** of two sources:
  - **JWKS URL**: an absolute URL where you publish your JWKS, or
  - **Inline JWK**: a single public JWK as a JSON object.
- The key is `RSA` or `EC` on curve `P-256`, with no private members (`d`, `p`, `q`, `dp`, `dq`, `qi`). A key with a private member is rejected.
- `audiences` is not filled in for `PARTNER_KEY` (it is sent as `[]`).

An invalid key, or both or neither source: the backend returns 400 (`partner_key_invalid`).

### Widget

Add `identityTokenType: 'jwt'` to the `mount` options. Without it, the widget treats the token as an ID token (path 1):

```js
window.ReservaWidget.push([
  'mount',
  '#reserva-widget',
  {
    clientId: '<public client application id>',
    locationId: '<location id>',
    identityTokenType: 'jwt', // 'id_token' (default, path 1) | 'jwt' (path 2)
    getIdentityToken, // returns your signed assertion
  },
]);
```

### Header and claims

`alg` is `RS256` or `ES256`. `kid` is optional and is used to pick the key from the JWKS.

| Claim            | Required | Meaning                                                                               |
| ---------------- | -------- | ------------------------------------------------------------------------------------- |
| `iss`            | yes      | The registered `PARTNER_KEY` issuer.                                                  |
| `aud`            | yes      | Must contain `reserva`.                                                               |
| `sub`            | yes      | A stable identifier of the user on your side.                                         |
| `email`          | yes      | Contact data only. It is never used to link accounts.                                 |
| `email_verified` | no       | Whether the email is verified.                                                        |
| `exp`            | yes      | At most 300 s after receipt and after `iat`.                                          |
| `iat`            | no       | Issue time.                                                                           |
| `jti`            | yes      | Unique per partner. A repeated `jti` is rejected, so every assertion needs a new one. |

The allowed clock skew is 60 s.

Keep the private key on the server only: in environment secrets, never in front-end code, in the repository, or in an API response.

Example of signing in Node.js (`jose`):

```js
import { SignJWT, importPKCS8 } from 'jose';
import { randomUUID } from 'node:crypto';

// PARTNER_KEY: private key (PKCS#8 PEM), from the server environment only
const privateKey = await importPKCS8(process.env.PARTNER_KEY, 'ES256');

export async function signIdentityAssertion(user) {
  return new SignJWT({ email: user.email, email_verified: user.emailVerified })
    .setProtectedHeader({ alg: 'ES256', kid: process.env.PARTNER_KEY_ID })
    .setIssuer('<iss>') // the registered PARTNER_KEY issuer
    .setSubject(user.id)
    .setAudience('reserva')
    .setIssuedAt()
    .setExpirationTime('5m') // at most 300 s
    .setJti(randomUUID())
    .sign(privateKey);
}
```

Your backend endpoint returns the assertion only to a signed-in user:

```js
app.get('/api/reserva-identity', requireLogin, async (req, res) => {
  res.json({ token: await signIdentityAssertion(req.user) });
});
```

Front end:

```js
getIdentityToken: async () => {
  const response = await fetch('/api/reserva-identity', { credentials: 'include' });
  if (!response.ok) return null; // not signed in: guest
  return (await response.json()).token; // a fresh token for every call
},
```

### What Reserva does with the assertion

The widget exchanges the assertion for a Reserva token with `POST /auth/oauth2/token` (`application/x-www-form-urlencoded`):

| Field                | Value                                             |
| -------------------- | ------------------------------------------------- |
| `grant_type`         | `urn:ietf:params:oauth:grant-type:token-exchange` |
| `client_id`          | the public client application id                  |
| `subject_token`      | your signed assertion                             |
| `subject_token_type` | `urn:ietf:params:oauth:token-type:jwt`            |
| `scope`              | optional                                          |

Possible errors:

- `invalid_grant`: the assertion was rejected (signature, `iss`, `aud`, `exp`, repeated `jti`, ...).
- `invalid_client`: the partner is unknown or disabled.
- `invalid_scope`: the requested scope is not allowed for the partner.
- `invalid_request`: wrong `subject_token_type`.

The resulting Reserva token is used to create reservations. A reservation carries the user's `externalIdentityId`.

## 5. Terms of use

- The "by Reserva" mark (with the Reserva logo) at the bottom of the widget **must stay visible** in every widget state.
- It is forbidden to cover it, clip it (an iframe height or width smaller than its content, or `overflow: hidden` on a parent), make it transparent, or change or remove it in any way.
- Breaking this rule is grounds for removing the partner. The same rule is in the Reserva Terms of use (`/terms`).

## 6. Security notes

- **Exact origins.** Enter exact origins (scheme, host, port) in `allowed_origins`. Do not use `'*'` or patterns.
- **No `'*'` in messages.** The loader sends messages to the iframe only to the Reserva origin, and accepts messages only from that origin and only from its own iframe. If you write your own code around the widget, do not use `postMessage(..., '*')`.
- **Iframe sandbox.** The loader sets `sandbox` without `allow-top-navigation`, and `referrerpolicy="strict-origin"`. Do not change these attributes.
- **The Reserva token is never visible on the partner's page.** It lives only inside the iframe. The partner page sees only its own identity and the `onReservationCreated` payload, with the fields `id`, `status`, `startTime`, `endTime` and `locationName`. It contains no email and no user or identity IDs.
- Do not write the identity token that you return from `getIdentityToken` to logs, and do not put it in a URL.
