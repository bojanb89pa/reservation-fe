# FE brief — uklonjen `POST /auth/users/google-sign-in`

BE tiket: #310 (epic #115). Servis: `auth-service`.

## Šta se promenilo

- Endpoint `POST /auth/users/google-sign-in` je uklonjen. Zahtev ka njemu sada vraća 401/404.
- Google prijava preko OIDC-a (redirect tok preko auth-service login stranice) radi kao do sada.

## Šta FE treba da uradi

- Ništa. FE nije pozivao ovaj endpoint.
- Ako negde u kodu postoji poziv ka `/auth/users/google-sign-in`, treba ga ukloniti. Google prijava ide isključivo kroz OIDC tok.
