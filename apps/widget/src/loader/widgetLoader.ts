/**
 * Reserva booking widget loader (`/widget.js`) — public, versioned contract (protocol v1).
 *
 * Runs on the PARTNER's page, so it is a small standalone bundle: no React, no @fe/ui. Types
 * from `@fe/domain` are `import type`; only `parseWidgetMessage`, `WidgetMessageType` and
 * `WIDGET_PROTOCOL_VERSION` end up in the bundle.
 *
 * Snippet (the partner page):
 *
 *   <div id="reserva-widget"></div>
 *   <script>
 *     window.ReservaWidget = window.ReservaWidget || [];
 *     window.ReservaWidget.push(['mount', '#reserva-widget', {
 *       clientId: '<public client application id>',
 *       locationId: '<location id>',
 *       theme: 'auto',            // optional: 'light' | 'dark' | 'auto' (default 'auto')
 *       locale: 'sr',             // optional: 'sr' | 'en' (default 'sr')
 *       getIdentityToken: () => myAuth.getOidcIdToken(), // string | null | Promise<string | null>
 *       identityTokenType: 'jwt', // optional: 'id_token' (default, put 1) | 'jwt' (put 2, partner-signed assertion)
 *       onReservationCreated: (r) => {},  // { id, status, startTime, endTime, locationName }
 *       onUnavailable: ({ reason }) => {}, // 'LOCATION_OUT_OF_SCOPE' | 'CONSENT_NOT_APPROVED' | 'PARTNER_DISABLED'
 *       onSignInRequired: () => {},        // optional: a guest clicked "Reserve"; open your sign-in, then call
 *                                          // `ReservaWidget.refreshIdentity()` — the widget finishes the booking
 *     }]);
 *   </script>
 *   <script async src="https://<reserva origin>/widget.js"></script>
 *
 * Commands (queued before the script loads, executed in order; afterwards `push` runs them at once):
 *   ['mount', selector, options]   renders the iframe into the first element matching `selector`
 *   ['refreshIdentity', selector?] calls `getIdentityToken()` again and sends a new
 *                                  `reserva:identity` (all widgets, or the one mounted at `selector`).
 *                                  Also available as `window.ReservaWidget.refreshIdentity(selector?)`.
 *
 * `getIdentityToken` returns the partner user's OIDC ID token, or `null` for a guest. A guest can pick
 * a slot; "Reserve" then makes the widget remember the choice and send `reserva:sign-in-required`
 * (→ `onSignInRequired()`). After the partner signs the user in and calls `refreshIdentity`, the widget
 * completes the remembered booking. Without `onSignInRequired` the widget just asks the guest to sign
 * in on the partner's site. The Reserva partner token lasts ~10 minutes and has no refresh:
 * when it expires the iframe sends `reserva:need-identity` again and the loader calls
 * `getIdentityToken()` again.
 *
 * postMessage protocol (see `WidgetMessage` in @fe/domain; every message has `v` and `type`):
 *   iframe → loader: reserva:ready, reserva:need-identity, reserva:resize {height},
 *                    reserva:reservation-created {reservation}, reserva:unavailable {reason},
 *                    reserva:sign-in-required (a guest tried to book; additive, protocol stays v1)
 *   loader → iframe: reserva:identity {idToken, tokenType?}
 * Security: the loader only reacts to messages whose `event.origin` is the Reserva origin (the origin
 * `widget.js` was loaded from) and whose `event.source` is the widget's own iframe. Outgoing messages
 * always use the Reserva origin as `targetOrigin`, never `'*'`. The iframe is sandboxed WITHOUT
 * `allow-top-navigation` and sends `referrerpolicy="strict-origin"`.
 */
import { WIDGET_PROTOCOL_VERSION, WidgetMessageType, parseWidgetMessage } from '@fe/domain';
import type { HostToWidgetMessage, WidgetMountOptions } from '@fe/domain';

export const WIDGET_IFRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads';
export const WIDGET_IFRAME_REFERRER_POLICY = 'strict-origin';

const INITIAL_IFRAME_HEIGHT = 420;
const MAX_IFRAME_HEIGHT = 10_000;

export type ReservaWidgetCommand =
  | readonly ['mount', string, WidgetMountOptions]
  | readonly ['refreshIdentity', string?];

export interface ReservaWidgetApi {
  push(...commands: ReservaWidgetCommand[]): number;
  refreshIdentity(selector?: string): Promise<void>;
}

interface Instance {
  selector: string;
  iframe: HTMLIFrameElement;
  options: WidgetMountOptions;
}

function safely(callback: () => void) {
  try {
    callback();
  } catch (error) {
    console.error('[ReservaWidget] callback failed', error);
  }
}

function isMountOptions(value: unknown): value is WidgetMountOptions {
  if (typeof value !== 'object' || value === null) return false;
  const options = value as Partial<WidgetMountOptions>;
  return (
    typeof options.clientId === 'string' &&
    options.clientId !== '' &&
    typeof options.locationId === 'string' &&
    options.locationId !== '' &&
    typeof options.getIdentityToken === 'function'
  );
}

export function installReservaWidget(
  win: Window,
  doc: Document,
  reservaOrigin: string,
): ReservaWidgetApi {
  const holder = win as Window & { ReservaWidget?: unknown };
  const previous = holder.ReservaWidget;
  if (previous && !Array.isArray(previous)) return previous as ReservaWidgetApi;

  const instances: Instance[] = [];

  async function sendIdentity(instance: Instance) {
    let idToken: string | null = null;
    try {
      const token = await instance.options.getIdentityToken();
      idToken = typeof token === 'string' && token !== '' ? token : null;
    } catch (error) {
      console.error('[ReservaWidget] getIdentityToken failed', error);
    }
    const message: HostToWidgetMessage = {
      v: WIDGET_PROTOCOL_VERSION,
      type: WidgetMessageType.IDENTITY,
      idToken,
      ...(instance.options.identityTokenType
        ? { tokenType: instance.options.identityTokenType }
        : {}),
    };
    instance.iframe.contentWindow?.postMessage(message, reservaOrigin);
  }

  function onMessage(event: MessageEvent) {
    if (event.origin !== reservaOrigin) return;
    const instance = instances.find((i) => i.iframe.contentWindow === event.source);
    if (!instance) return;
    const message = parseWidgetMessage(event.data);
    if (!message) return;
    switch (message.type) {
      case WidgetMessageType.NEED_IDENTITY:
        void sendIdentity(instance);
        break;
      case WidgetMessageType.RESIZE:
        instance.iframe.style.height = `${Math.min(Math.ceil(message.height), MAX_IFRAME_HEIGHT)}px`;
        break;
      case WidgetMessageType.RESERVATION_CREATED:
        safely(() => instance.options.onReservationCreated?.(message.reservation));
        break;
      case WidgetMessageType.UNAVAILABLE:
        safely(() => instance.options.onUnavailable?.({ reason: message.reason }));
        break;
      case WidgetMessageType.SIGN_IN_REQUIRED:
        safely(() => instance.options.onSignInRequired?.());
        break;
      default:
        break; // ready (nothing to do) and identity (loader → iframe only)
    }
  }
  win.addEventListener('message', onMessage);

  function mount(selector: string, options: unknown) {
    const container = doc.querySelector(selector);
    if (!container) {
      console.error(`[ReservaWidget] mount: no element matches "${selector}"`);
      return;
    }
    if (!isMountOptions(options)) {
      console.error(
        '[ReservaWidget] mount: clientId, locationId and getIdentityToken are required',
      );
      return;
    }

    const url = new URL('/widget/', reservaOrigin);
    url.searchParams.set('clientId', options.clientId);
    url.searchParams.set('locationId', options.locationId);
    if (options.theme) url.searchParams.set('theme', options.theme);
    if (options.locale) url.searchParams.set('locale', options.locale);
    // Host page origin: the iframe posts to it (as `targetOrigin`) only if the partner allows it.
    url.searchParams.set('origin', win.location.origin);
    url.searchParams.set('v', String(WIDGET_PROTOCOL_VERSION));

    const iframe = doc.createElement('iframe');
    iframe.src = url.toString();
    iframe.title = 'Reserva';
    iframe.setAttribute('sandbox', WIDGET_IFRAME_SANDBOX);
    iframe.setAttribute('referrerpolicy', WIDGET_IFRAME_REFERRER_POLICY);
    iframe.style.cssText = `display:block;width:100%;border:0;height:${INITIAL_IFRAME_HEIGHT}px`;

    const existing = instances.findIndex((i) => i.iframe.parentElement === container);
    if (existing !== -1) instances.splice(existing, 1);
    container.replaceChildren(iframe);
    instances.push({ selector, iframe, options });
  }

  async function refreshIdentity(selector?: string) {
    const targets = selector ? instances.filter((i) => i.selector === selector) : instances;
    await Promise.all(targets.map(sendIdentity));
  }

  function run(command: ReservaWidgetCommand) {
    if (command[0] === 'mount') mount(command[1], command[2]);
    else if (command[0] === 'refreshIdentity') void refreshIdentity(command[1]);
    else console.error('[ReservaWidget] unknown command', command);
  }

  const api: ReservaWidgetApi = {
    push(...commands) {
      commands.forEach(run);
      return commands.length;
    },
    refreshIdentity,
  };
  holder.ReservaWidget = api;
  if (Array.isArray(previous)) (previous as ReservaWidgetCommand[]).forEach(run);
  return api;
}
