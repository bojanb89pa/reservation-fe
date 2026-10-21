/** Konfiguracija demo sajta; sve vrednosti dolaze iz `VITE_` env-a (vidi `.env.example`). */
export interface DemoConfig {
  reservaOrigin: string;
  clientId: string;
  locationId: string;
  noConsentLocationId: string;
  googleClientId: string;
}

export function readConfig(env: ImportMetaEnv = import.meta.env): DemoConfig {
  return {
    reservaOrigin: (env.VITE_RESERVA_ORIGIN ?? '').replace(/\/+$/, ''),
    clientId: env.VITE_DEMO_CLIENT_ID ?? '',
    locationId: env.VITE_DEMO_LOCATION_ID ?? '',
    noConsentLocationId: env.VITE_DEMO_NO_CONSENT_LOCATION_ID ?? '',
    googleClientId: env.VITE_GOOGLE_CLIENT_ID ?? '',
  };
}
