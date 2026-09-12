# FE brief — login stranica prati temu i jezik aplikacije

BE tiket: #48 (epic #8, `feature/8-azurianje-stila-za-login-stranicu`)
Servis: `auth-service`, stranica `GET /auth/login` (Thymeleaf, van React app-a).

---

## 1. Šta je urađeno na BE (api sloj)

`LoginController` (`GET /login`, stvarna putanja iza context path-a je `/auth/login`) sada:

- Renderuje CSS temu (dark/light) preko `data-theme` atributa na `<html>` elementu.
- Renderuje sve tekstove na stranici lokalizovano (trenutno `en` i `sr`), umesto fiksnog engleskog teksta.
- Nema JSON telo, nema request/response DTO — ovo je server-rendered HTML stranica, ne REST endpoint.

**Ovo NIJE poziv koji FE inicira preko `fetch`/`axios`.** Do `/login` se dolazi isključivo kroz
browser redirect: FE preusmerava browser na `/oauth2/authorize?...`, a ako korisnik nije
ulogovan, `auth-service`-ova Spring Security konfiguracija sama radi redirect na `/login`
(bez ikakvih query parametara iz originalnog zahteva). Zbog toga tema/jezik **ne mogu** stići
kao query parametar na `/oauth2/authorize` — taj deo URL-a se gubi u redirect lancu.

---

## 2. Mehanizam koji FE mora da implementira: kolačići, ne query parametri

Pre nego što FE preusmeri browser na `/oauth2/authorize` (ili bilo koji auth flow koji može
završiti na login stranici), FE treba da postavi **dva kolačića** na trenutnom origin-u:

| Kolačić | Dozvoljene vrednosti | Default na BE ako nedostaje/nevažeći |
|---|---|---|
| `theme` | `light`, `dark` | `light` |
| `lang`  | `en`, `sr` | `en` |

```ts
document.cookie = `theme=${currentTheme}; path=/`;
document.cookie = `lang=${currentLanguage}; path=/`;
// zatim: window.location.href = authorizeUrl;
```

`LoginController` čita ove kolačiće (case-insensitive vrednosti) i, ako ih ne nađe, pada nazad
na query parametre `?theme=...&lang=...` na samom `/login` URL-u (korisno samo ako se na
`/login` linkuje direktno, npr. u testiranju — u normalnom flow-u kolačići su jedini pouzdan
kanal).

**Bitno ograničenje (van dometa ovog api-layer tiketa, ali blokira funkcionisanje u prodi):**
kolačić mora biti vidljiv `auth-service`-u kada browser pošalje zahtev ka njemu. Ako FE i
`auth-service` nisu na istom origin-u/domenu (npr. u dev-u FE je na drugom portu), kolačić
postavljen sa FE strane se **neće** poslati ka `auth-service`-u osim ako:
- FE i auth-service dele isti parent domen i kolačić se eksplicitno postavi sa
  `Domain=.reserva.app` (ili šta god je produkcioni domen), ili
- postoji reverse proxy koji ih spaja pod isti origin.

Proveriti ovo sa BE/infra pre nego što se feature smatra gotovim end-to-end — sam `LoginController`
je spreman da pročita kolačiće, ali njihovu vidljivost auth-service-u obezbeđuje domenska/proxy
konfiguracija koja nije deo ovog tiketa.

---

## 3. Vizuelni deo (za referencu, ne zahteva FE kod)

- `login.css` sada ima `:root[data-theme="dark"]` varijantu tokena (boje, pozadina, senke).
  Paleta za dark mod je BE-strana pretpostavka (nije vučena iz FE design tokena) —
  ako se razlikuje od app-ovog dark moda, javiti tačne vrednosti (`--primary`, `--bg`,
  `--surface`, `--ink-900`, `--ink-500`, `--ink-300`, `--border`) pa će se CSS uskladiti.
- Lokalizovani tekstovi trenutno pokrivaju: naslov, labele forme, dugme, footer link ka
  registraciji, "ili" separator, naslov Google dugmeta, i sve alert poruke (aktivacija,
  greška pri loginu). Ako app podržava i druge jezike osim `en`/`sr`, javiti listu — trenutno
  su podržana samo ta dva (isti par kao `resource-service`-ovi `messages*.properties`).

---

## 4. TypeScript / integracija

Nema request/response tela za dokumentovanje — jedini "kontrakt" su dva kolačića opisana u
sekciji 2. Za referencu, tip vrednosti:

```ts
type LoginTheme = 'light' | 'dark';
type LoginLanguage = 'en' | 'sr';

function setLoginCookiesBeforeAuthRedirect(theme: LoginTheme, lang: LoginLanguage): void {
  document.cookie = `theme=${theme}; path=/`;
  document.cookie = `lang=${lang}; path=/`;
}
```

Pozvati ovu funkciju neposredno pre svakog redirect-a ka `/oauth2/authorize` (npr. na klik na
"Login" dugme u app-u), sa trenutnom vrednošću iz theme/i18n state-a.

---

## 5. Greške

Nema novih error kodova. Nevažeća ili nepodržana vrednost kolačića/parametra se tiho zamenjuje
default-om (`light` / `en`) — nema 400 ni redirect-a na error stranicu za ovaj slučaj.

---

## 6. Predlog FE feature-a

- Naziv: `login-page-theme-and-language`
- Grana: `feature/8-azurianje-stila-za-login-stranicu` u `reservation-fe`
- Predložena komanda:

```bash
./scripts/implement-feature.sh login-page-theme-and-language
```

Obim: mala izmena na mestu gde FE trenutno pokreće auth redirect (login dugme / auth guard) —
dodati postavljanje `theme`/`lang` kolačića pre `window.location.href = authorizeUrl`, čitajući
vrednosti iz postojećeg theme/i18n state-a. Nema novih komponenti ni API poziva.
