import { installReservaWidget } from './widgetLoader';

// The Reserva origin is the origin this script was loaded from.
const script =
  (document.currentScript as HTMLScriptElement | null) ??
  document.querySelector<HTMLScriptElement>('script[src*="widget.js"]');

if (script?.src) {
  installReservaWidget(window, document, new URL(script.src, window.location.href).origin);
} else {
  console.error('[ReservaWidget] cannot determine the script origin; widget not installed');
}
