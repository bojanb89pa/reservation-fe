import type { DemoConfig } from './config';
import type { Contact } from './content';
import { renderContact } from './contact';
import type { IdentityProvider } from './identityProvider';
import type { SiteTheme } from './theme';

export type UnavailableReason =
  | 'LOCATION_OUT_OF_SCOPE'
  | 'CONSENT_NOT_APPROVED'
  | 'PARTNER_DISABLED';

type Command = readonly unknown[];
type WidgetWindow = Window & { ReservaWidget?: Command[] };

/** Učitava javni loader `{RESERVA_ORIGIN}/widget.js`, kao pravi partner (async script). */
export function loadWidgetScript(doc: Document, reservaOrigin: string): HTMLScriptElement {
  const script = doc.createElement('script');
  script.async = true;
  script.src = `${reservaOrigin}/widget.js`;
  doc.head.append(script);
  return script;
}

function queue(win: Window): { push(...c: Command[]): unknown } {
  const w = win as WidgetWindow;
  w.ReservaWidget = w.ReservaWidget || [];
  return w.ReservaWidget;
}

export interface MountOptions {
  selector: string;
  locationId: string;
  config: DemoConfig;
  identity: IdentityProvider;
  /** Kontakt koji se prikazuje umesto widget-a kad je lokacija nedostupna. */
  fallbackContact: Contact;
  /** Trenutna tema sajta; widget se mount-uje sa njom. */
  theme: SiteTheme;
}

/** Menja temu svih widget-a bez reload-a (`setTheme`); radi i pre učitavanja loader-a. */
export function setWidgetTheme(win: Window, theme: SiteTheme): void {
  queue(win).push(['setTheme', theme]);
}

/** Stavlja `mount` u `window.ReservaWidget` queue; radi i pre i posle učitavanja loader-a. */
export function mountWidget(win: Window, doc: Document, options: MountOptions): void {
  const { selector, locationId, config, identity, fallbackContact, theme } = options;
  queue(win).push([
    'mount',
    selector,
    {
      clientId: config.clientId,
      locationId,
      theme,
      locale: 'sr',
      getIdentityToken: () => identity.getIdentityToken(),
      onSignInRequired: () => identity.requestSignIn(),
      onUnavailable: ({ reason }: { reason: UnavailableReason }) => {
        const container = doc.querySelector<HTMLElement>(selector);
        if (container) renderContact(container, fallbackContact, reason);
      },
    },
  ]);
}

/** Posle svakog logina i logouta traži od widget-a novi token (`refreshIdentity`). */
export function bindIdentityRefresh(win: Window, identity: IdentityProvider): () => void {
  return identity.subscribe(() => {
    queue(win).push(['refreshIdentity']);
  });
}
