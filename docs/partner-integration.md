# Uputstvo za integraciju partnera: Reserva widget

Ovo uputstvo je za partnera koji na svoj sajt ugrađuje Reserva widget za rezervacije. Ugovor je definisan komentarom loader-a (`apps/widget/src/loader/widgetLoader.ts`) i tipovima `WidgetMountOptions` i `WidgetMessage` u `@fe/domain`. Ako se uputstvo i kod razlikuju, važi kod.

## 1. Šta partner dobija od Reserve

- **Client application**: registracija partnera u Reservi.
- **`clientId`**: javni identifikator client application-a. Nije tajna i ide u kod stranice.
- **`allowed_origins`**: lista tačnih origin-a (`https://sajt-partnera.example`) sa kojih se widget sme ugraditi. Widget šalje poruke samo origin-u stranice koji je na toj listi.
- **Saglasnost biznisa po lokaciji**: widget radi samo za lokacije biznisa koji je partneru odobrio saglasnost.

Kad widget ne može da se koristi, loader poziva `onUnavailable({ reason })`:

| `reason` | Značenje |
|---|---|
| `LOCATION_OUT_OF_SCOPE` | Lokacija ne pripada ovom partneru. |
| `CONSENT_NOT_APPROVED` | Biznis nije odobrio saglasnost za tu lokaciju. |
| `PARTNER_DISABLED` | Admin Reserve je isključio partnera. |

Partner u tom slučaju treba da prikaže rezervnu opciju, npr. kontakt telefon.

## 2. Ugradnja loader-a

```html
<div id="reserva-widget"></div>
<script>
  window.ReservaWidget = window.ReservaWidget || [];
  window.ReservaWidget.push(['mount', '#reserva-widget', {
    clientId: '<javni client application id>',
    locationId: '<id lokacije>',
    theme: 'auto',   // opciono: 'light' | 'dark' | 'auto' (podrazumevano 'auto')
    locale: 'sr',    // opciono: 'sr' | 'en' (podrazumevano 'sr')
    // string | null | Promise<string | null>; null znači gost
    getIdentityToken: () => myAuth.getIdentityToken(),
    // { id, status, startTime, endTime, locationName }
    onReservationCreated: (reservation) => {
      console.log('Rezervacija kreirana', reservation.id);
    },
    onUnavailable: ({ reason }) => {
      // 'LOCATION_OUT_OF_SCOPE' | 'CONSENT_NOT_APPROVED' | 'PARTNER_DISABLED'
      document.querySelector('#reserva-widget').textContent = 'Rezervacija trenutno nije dostupna.';
    },
  }]);
</script>
<script async src="https://<reserva origin>/widget.js"></script>
```

Obavezna polja su `clientId`, `locationId` i `getIdentityToken`. Bez njih `mount` ispisuje grešku u konzolu i ne renderuje ništa.

Komande se stavljaju u red `window.ReservaWidget` pre učitavanja skripte i izvršavaju se redom. Posle učitavanja `push` ih izvršava odmah.

- `['mount', selector, options]` renderuje iframe u prvi element koji odgovara selektoru.
- `['refreshIdentity', selector?]` ponovo poziva `getIdentityToken()` i šalje widget-u novi identitet. Bez selektora važi za sve widget-e. Dostupno je i kao `window.ReservaWidget.refreshIdentity(selector?)`.

**Pozovite `refreshIdentity` posle svakog logina i logouta** korisnika na vašem sajtu:

```js
function onAuthChanged() {
  window.ReservaWidget.push(['refreshIdentity']);
}
```

Reserva token u widget-u traje oko 10 minuta i nema refresh. Kad istekne, widget sam traži identitet ponovo, a loader poziva `getIdentityToken()`. Ta funkcija zato uvek treba da vrati svež, nepotrošen token ili `null`.

Gost (`null`) vidi termine, ali ne i dugme za zakazivanje.

## 3. Put 1: pouzdani OIDC izdavalac (npr. Google)

Ako se vaši korisnici prijavljuju preko pouzdanog OIDC izdavaoca, ID token tog izdavaoca prosleđujete direktno kroz `getIdentityToken`. Backend nije potreban.

Primer sa Google Identity Services, kao na demo sajtu (`apps/demo-partner`):

```html
<script src="https://accounts.google.com/gsi/client" async></script>
<div id="google-login"></div>
<script>
  let idToken = null;

  window.addEventListener('load', () => {
    google.accounts.id.initialize({
      client_id: '<vaš Google OAuth client id>',
      callback: ({ credential }) => {
        idToken = credential; // ID token ostaje u memoriji
        window.ReservaWidget.push(['refreshIdentity']);
      },
    });
    google.accounts.id.renderButton(document.getElementById('google-login'), {
      type: 'standard', theme: 'outline', text: 'signin_with',
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
    return exp * 1000 > Date.now() ? idToken : null; // istekao token tretira se kao gost
  }

  window.ReservaWidget = window.ReservaWidget || [];
  window.ReservaWidget.push(['mount', '#reserva-widget', {
    clientId: '<javni client application id>',
    locationId: '<id lokacije>',
    getIdentityToken,
  }]);
</script>
```

Napomena: dekodiranje tokena u primeru služi samo za proveru isteka. Potpis proverava Reserva.

## 4. Put 2: partner ima backend i sam potpisuje tvrdnju

Partner sa sopstvenim backend-om potpisuje kratkotrajnu tvrdnju (JWT) o identitetu svog prijavljenog korisnika. Front dobija taj token od vašeg backend-a i vraća ga kroz `getIdentityToken`. Reserva proverava potpis vašim javnim ključem, pa vam nije potreban OIDC izdavalac.

### Registracija ključa

Administrator Reserve u integraciji partnera dodaje pouzdanog izdavaoca tipa `PARTNER_KEY`:

- `issuer`: vaš identifikator (URL ili neki neprozirni ID, bez razmaka). To je `iss` u svakoj tvrdnji.
- Javni ključ, **tačno jedan** od dva izvora:
  - **JWKS URL**: apsolutan URL na kom objavljujete JWKS, ili
  - **Inline JWK**: jedan javni JWK kao JSON objekat.
- Ključ je `RSA` ili `EC` sa krivom `P-256`, bez privatnih članova (`d`, `p`, `q`, `dp`, `dq`, `qi`). Ključ sa privatnim članom se odbija.
- `audiences` se za `PARTNER_KEY` ne popunjava (šalje se `[]`).

Neispravan ključ, ili oba/nijedan izvor: backend vraća 400 (`partner_key_invalid`).

### Widget

Dodajte `identityTokenType: 'jwt'` u opcije `mount`. Bez toga widget šalje token kao ID token (put 1):

```js
window.ReservaWidget.push(['mount', '#reserva-widget', {
  clientId: '<javni client application id>',
  locationId: '<id lokacije>',
  identityTokenType: 'jwt', // 'id_token' (podrazumevano, put 1) | 'jwt' (put 2)
  getIdentityToken,         // vraća vašu potpisanu tvrdnju
}]);
```

### Zaglavlje i claim-ovi

`alg` je `RS256` ili `ES256`. `kid` je opcion i koristi se za izbor ključa iz JWKS-a.

| Claim | Obavezan | Značenje |
|---|---|---|
| `iss` | da | Registrovani `PARTNER_KEY` izdavalac. |
| `aud` | da | Mora sadržati `reserva`. |
| `sub` | da | Stabilan identifikator korisnika kod partnera. |
| `email` | da | Samo kontakt podatak. Nikad se ne koristi za vezivanje naloga. |
| `email_verified` | ne | Da li je email potvrđen. |
| `exp` | da | Najviše 300 s od prijema tvrdnje i od `iat`. |
| `iat` | ne | Vreme izdavanja. |
| `jti` | da | Jedinstven po partneru. Ponovljen `jti` se odbija, pa svaka tvrdnja dobija nov. |

Dozvoljeno odstupanje sata je 60 s.

Privatni ključ čuva se samo na serveru: u tajnama okruženja, nikad u front kodu, repou ni odgovoru API-ja.

Primer potpisivanja u Node-u (`jose`):

```js
import { SignJWT, importPKCS8 } from 'jose';
import { randomUUID } from 'node:crypto';

// PARTNER_KEY: privatni ključ (PKCS#8 PEM), samo iz server okruženja
const privateKey = await importPKCS8(process.env.PARTNER_KEY, 'ES256');

export async function signIdentityAssertion(user) {
  return new SignJWT({ email: user.email, email_verified: user.emailVerified })
    .setProtectedHeader({ alg: 'ES256', kid: process.env.PARTNER_KEY_ID })
    .setIssuer('<iss>')       // registrovani PARTNER_KEY izdavalac
    .setSubject(user.id)
    .setAudience('reserva')
    .setIssuedAt()
    .setExpirationTime('5m')  // najviše 300 s
    .setJti(randomUUID())
    .sign(privateKey);
}
```

Endpoint vašeg backend-a vraća tvrdnju samo prijavljenom korisniku:

```js
app.get('/api/reserva-identity', requireLogin, async (req, res) => {
  res.json({ token: await signIdentityAssertion(req.user) });
});
```

Front:

```js
getIdentityToken: async () => {
  const response = await fetch('/api/reserva-identity', { credentials: 'include' });
  if (!response.ok) return null; // nije prijavljen: gost
  return (await response.json()).token; // svež token za svaki poziv
},
```

### Šta Reserva radi sa tvrdnjom

Widget menja tvrdnju za Reserva token pozivom `POST /auth/oauth2/token` (`application/x-www-form-urlencoded`):

| Polje | Vrednost |
|---|---|
| `grant_type` | `urn:ietf:params:oauth:grant-type:token-exchange` |
| `client_id` | javni client application id |
| `subject_token` | vaša potpisana tvrdnja |
| `subject_token_type` | `urn:ietf:params:oauth:token-type:jwt` |
| `scope` | opciono |

Moguće greške:

- `invalid_grant`: tvrdnja je odbijena (potpis, `iss`, `aud`, `exp`, ponovljen `jti`...).
- `invalid_client`: partner je nepoznat ili isključen.
- `invalid_scope`: traženi scope nije dozvoljen partneru.
- `invalid_request`: pogrešan `subject_token_type`.

Dobijeni Reserva token služi za pravljenje rezervacije, koja nosi `externalIdentityId` korisnika.

## 5. Bezbednosne napomene

- **Tačan origin.** U `allowed_origins` upišite tačne origin-e (šema, host, port). Ne koristite `'*'` ni šablone.
- **Bez `'*'` u porukama.** Loader šalje poruke iframe-u samo Reserva origin-u i prima ih samo od njega i samo od sopstvenog iframe-a. Ako pišete svoj kod oko widget-a, nemojte koristiti `postMessage(..., '*')`.
- **Sandbox iframe-a.** Loader postavlja `sandbox` bez `allow-top-navigation` i `referrerpolicy="strict-origin"`. Ne menjajte te atribute.
- **Reserva token se nikad ne vidi na stranici partnera.** Reserva token živi samo u iframe-u. Partnerska stranica vidi samo svoj identitet i `onReservationCreated` sa poljima `id`, `status`, `startTime`, `endTime` i `locationName`, bez email-a i bez ID-ova korisnika.
- Identitetski token koji vraćate iz `getIdentityToken` ne upisujte u logove i ne stavljajte ga u URL.
