import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WIDGET_PROTOCOL_VERSION, WidgetMessageType } from '@fe/domain';
import { installReservaWidget } from '../widgetLoader';

const RESERVA = 'https://reserva.test';
const PAYLOAD = {
  id: 'r-1',
  status: 'PENDING_APPROVAL',
  startTime: '2026-11-01T10:00:00',
  endTime: '2026-11-01T11:00:00',
  locationName: 'Studio',
};

function setup(options: Record<string, unknown> = {}) {
  const getIdentityToken = vi.fn().mockResolvedValue('id-token');
  const onReservationCreated = vi.fn();
  const onUnavailable = vi.fn();
  const api = installReservaWidget(window, document, RESERVA);
  api.push([
    'mount',
    '#host',
    {
      clientId: 'client-1',
      locationId: 'loc-1',
      getIdentityToken,
      onReservationCreated,
      onUnavailable,
      ...options,
    },
  ]);
  const iframe = document.querySelector('iframe')!;
  return { api, iframe, getIdentityToken, onReservationCreated, onUnavailable };
}

function post(origin: string, source: MessageEventSource | null, data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { origin, source, data }));
}

describe('widget.js loader', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    delete (window as { ReservaWidget?: unknown }).ReservaWidget;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('iframe attributes', () => {
    it('sandbox has no allow-top-navigation and referrerpolicy is strict-origin', () => {
      const { iframe } = setup();
      const tokens = iframe.getAttribute('sandbox')!.split(' ');
      expect(tokens).toEqual([
        'allow-scripts',
        'allow-same-origin',
        'allow-forms',
        'allow-popups',
        'allow-popups-to-escape-sandbox',
        'allow-downloads',
      ]);
      expect(tokens.some((t) => t.startsWith('allow-top-navigation'))).toBe(false);
      expect(iframe.getAttribute('referrerpolicy')).toBe('strict-origin');
    });

    it('points at /widget/ on the Reserva origin and passes the host origin', () => {
      const { iframe } = setup({ theme: 'dark', locale: 'en' });
      const url = new URL(iframe.src);
      expect(url.origin).toBe(RESERVA);
      expect(url.pathname).toBe('/widget/');
      expect(url.searchParams.get('clientId')).toBe('client-1');
      expect(url.searchParams.get('locationId')).toBe('loc-1');
      expect(url.searchParams.get('theme')).toBe('dark');
      expect(url.searchParams.get('locale')).toBe('en');
      expect(url.searchParams.get('origin')).toBe(window.location.origin);
    });

    it('replays commands queued before the script loaded', () => {
      const queue: unknown[] = [
        ['mount', '#host', { clientId: 'c', locationId: 'l', getIdentityToken: () => null }],
      ];
      (window as { ReservaWidget?: unknown }).ReservaWidget = queue;
      installReservaWidget(window, document, RESERVA);
      expect(document.querySelector('iframe')).not.toBeNull();
    });
  });

  describe('origin check', () => {
    it('ignores messages from a non-Reserva origin', () => {
      const { iframe, onReservationCreated, onUnavailable, getIdentityToken } = setup();
      const source = iframe.contentWindow;
      post('https://evil.test', source, {
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.RESERVATION_CREATED,
        reservation: PAYLOAD,
      });
      post('https://evil.test', source, {
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.UNAVAILABLE,
        reason: 'PARTNER_DISABLED',
      });
      post('https://evil.test', source, {
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.NEED_IDENTITY,
      });
      post('https://evil.test', source, {
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.RESIZE,
        height: 999,
      });
      expect(onReservationCreated).not.toHaveBeenCalled();
      expect(onUnavailable).not.toHaveBeenCalled();
      expect(getIdentityToken).not.toHaveBeenCalled();
      expect(iframe.style.height).toBe('420px');
    });

    it('ignores messages from the Reserva origin that do not come from its iframe', () => {
      const { onReservationCreated } = setup();
      post(RESERVA, window, {
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.RESERVATION_CREATED,
        reservation: PAYLOAD,
      });
      expect(onReservationCreated).not.toHaveBeenCalled();
    });

    it('handles messages from the Reserva origin', () => {
      const { iframe, onReservationCreated, onUnavailable } = setup();
      post(RESERVA, iframe.contentWindow, {
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.RESERVATION_CREATED,
        reservation: { ...PAYLOAD, email: 'leak@example.com' },
      });
      expect(onReservationCreated).toHaveBeenCalledWith(PAYLOAD);
      post(RESERVA, iframe.contentWindow, {
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.UNAVAILABLE,
        reason: 'LOCATION_OUT_OF_SCOPE',
      });
      expect(onUnavailable).toHaveBeenCalledWith({ reason: 'LOCATION_OUT_OF_SCOPE' });
      post(RESERVA, iframe.contentWindow, {
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.RESIZE,
        height: 512.4,
      });
      expect(iframe.style.height).toBe('513px');
    });
  });

  describe('sign-in required', () => {
    const message = { v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.SIGN_IN_REQUIRED };

    it('calls onSignInRequired', () => {
      const onSignInRequired = vi.fn();
      const { iframe } = setup({ onSignInRequired });
      post(RESERVA, iframe.contentWindow, message);
      expect(onSignInRequired).toHaveBeenCalledTimes(1);
    });

    it('catches an exception thrown by onSignInRequired', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { iframe } = setup({
        onSignInRequired: () => {
          throw new Error('boom');
        },
      });
      expect(() => post(RESERVA, iframe.contentWindow, message)).not.toThrow();
      expect(error).toHaveBeenCalled();
    });

    it('does nothing without the callback', () => {
      const { iframe } = setup();
      expect(() => post(RESERVA, iframe.contentWindow, message)).not.toThrow();
    });
  });

  describe('identity', () => {
    it('answers need-identity with the token, targeting the Reserva origin only', async () => {
      const { iframe, getIdentityToken } = setup();
      const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage');
      post(RESERVA, iframe.contentWindow, {
        v: WIDGET_PROTOCOL_VERSION,
        type: WidgetMessageType.NEED_IDENTITY,
      });
      await vi.waitFor(() => expect(postMessage).toHaveBeenCalled());
      expect(getIdentityToken).toHaveBeenCalledTimes(1);
      expect(postMessage).toHaveBeenCalledWith(
        { v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.IDENTITY, idToken: 'id-token' },
        RESERVA,
      );
    });

    it('sends tokenType when identityTokenType is set', async () => {
      const { iframe, api } = setup({ identityTokenType: 'jwt' });
      const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage');
      await api.refreshIdentity();
      expect(postMessage).toHaveBeenCalledWith(
        {
          v: WIDGET_PROTOCOL_VERSION,
          type: WidgetMessageType.IDENTITY,
          idToken: 'id-token',
          tokenType: 'jwt',
        },
        RESERVA,
      );
    });

    it('sends a null token for a guest or when getIdentityToken throws', async () => {
      const { iframe, api } = setup({
        getIdentityToken: vi.fn().mockRejectedValue(new Error('boom')),
      });
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage');
      await api.refreshIdentity();
      expect(postMessage).toHaveBeenCalledWith(
        { v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.IDENTITY, idToken: null },
        RESERVA,
      );
    });

    it('refreshIdentity pushes a new identity message', async () => {
      const { iframe, api, getIdentityToken } = setup();
      const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage');
      await api.refreshIdentity('#host');
      expect(getIdentityToken).toHaveBeenCalledTimes(1);
      expect(postMessage).toHaveBeenCalledTimes(1);
    });
  });
});
