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

> **Status:** backend podrška za put 2 stiže u kasnijem epicu (reservation-agents #77). Do tada je put 2 samo opisan. Detalji ključa (`PARTNER_KEY`) i zaštite od ponavljanja `jti` opisani su u planu (`docs/plan-faza-2-widget-partneri.md` u repou reservation-agents). Tačne vrednosti claim-ova (npr. `iss` i `aud`) uskladite sa planom i sa Reservom pre puštanja u rad.

Partner sa sopstvenim backend-om potpisuje kratkotrajnu tvrdnju o identitetu svog prijavljenog korisnika. Front dobija taj token od vašeg backend-a i vraća ga kroz `getIdentityToken`.

Obavezni claim-ovi:

| Claim | Značenje |
|---|---|
| `iss` | Identifikator partnera kao izdavaoca. |
| `sub` | Stabilan identifikator korisnika kod partnera. |
| `aud` | Odredište tvrdnje (Reserva). |
| `exp` | Rok važenja. Držite ga kratkim, nekoliko minuta. |
| `iat` | Vreme izdavanja. |
| `jti` | Jedinstven ID tvrdnje, za zaštitu od ponavljanja. Svaka tvrdnja dobija nov `jti`. |

Privatni ključ čuva se samo na serveru: u tajnama okruženja, nikad u front kodu, repou ni odgovoru API-ja.

Primer potpisivanja u Node-u (`jose`):

```js
import { SignJWT, importPKCS8 } from 'jose';
import { randomUUID } from 'node:crypto';

// PARTNER_KEY: privatni ključ (PKCS#8 PEM), samo iz server okruženja
const privateKey = await importPKCS8(process.env.PARTNER_KEY, 'ES256');

export async function signIdentityAssertion(user) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: process.env.PARTNER_KEY_ID })
    .setIssuer('<iss>')
    .setSubject(user.id)
    .setAudience('<aud>')
    .setIssuedAt()
    .setExpirationTime('5m')
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

## 5. Bezbednosne napomene

- **Tačan origin.** U `allowed_origins` upišite tačne origin-e (šema, host, port). Ne koristite `'*'` ni šablone.
- **Bez `'*'` u porukama.** Loader šalje poruke iframe-u samo Reserva origin-u i prima ih samo od njega i samo od sopstvenog iframe-a. Ako pišete svoj kod oko widget-a, nemojte koristiti `postMessage(..., '*')`.
- **Sandbox iframe-a.** Loader postavlja `sandbox` bez `allow-top-navigation` i `referrerpolicy="strict-origin"`. Ne menjajte te atribute.
- **Reserva token se nikad ne vidi na stranici partnera.** Reserva token živi samo u iframe-u. Partnerska stranica vidi samo svoj identitet i `onReservationCreated` sa poljima `id`, `status`, `startTime`, `endTime` i `locationName`, bez email-a i bez ID-ova korisnika.
- Identitetski token koji vraćate iz `getIdentityToken` ne upisujte u logove i ne stavljajte ga u URL.
