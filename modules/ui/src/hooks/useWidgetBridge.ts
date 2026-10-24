import { useCallback, useEffect, useRef, useState } from 'react';
import { WIDGET_PROTOCOL_VERSION, WidgetMessageType, parseWidgetMessage } from '@fe/domain';
import type { IdentityTokenType, WidgetTheme, WidgetToHostMessage } from '@fe/domain';
import { isAllowedMessageOrigin } from '@fe/application';

const IDENTITY_TIMEOUT_MS = 10_000;

interface Options {
  /** Origin of the embedding page, or `null` when unknown. */
  parentOrigin: string | null;
  /** Partner's `allowedOrigins`; `null` until the widget config is loaded. */
  allowedOrigins: readonly string[] | null;
  /** Called with the theme of a `reserva:theme` message (no reload; widget state is kept). */
  onTheme?: (theme: WidgetTheme) => void;
}

/** `undefined` = the loader has not answered yet, `null` = guest. */
type IdentityToken = string | null | undefined;

/**
 * iframe side of the postMessage protocol. Nothing is sent or accepted until the parent
 * origin is in the partner's `allowedOrigins`; after that only messages from exactly that
 * origin AND from `window.parent` are parsed, and every outgoing message uses it as
 * `targetOrigin` (never `'*'`).
 */
export function useWidgetBridge({ parentOrigin, allowedOrigins, onTheme }: Options) {
  const onThemeRef = useRef(onTheme);
  onThemeRef.current = onTheme;
  const trusted =
    parentOrigin !== null &&
    allowedOrigins !== null &&
    isAllowedMessageOrigin(parentOrigin, allowedOrigins);
  const [identityToken, setIdentityToken] = useState<IdentityToken>(undefined);
  const waitersRef = useRef<Array<(idToken: string | null) => void>>([]);
  const tokenTypeRef = useRef<IdentityTokenType | undefined>(undefined);

  const send = useCallback(
    (message: WidgetToHostMessage) => {
      if (!trusted || parentOrigin === null) return;
      window.parent.postMessage(message, parentOrigin);
    },
    [trusted, parentOrigin],
  );

  useEffect(() => {
    if (!trusted || parentOrigin === null || allowedOrigins === null) return;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      if (event.origin !== parentOrigin || !isAllowedMessageOrigin(event.origin, allowedOrigins)) {
        return;
      }
      const message = parseWidgetMessage(event.data);
      if (message?.type === WidgetMessageType.THEME) {
        onThemeRef.current?.(message.theme);
        return;
      }
      if (message?.type !== WidgetMessageType.IDENTITY) return;
      tokenTypeRef.current = message.tokenType;
      setIdentityToken(message.idToken);
      const waiters = waitersRef.current;
      waitersRef.current = [];
      waiters.forEach((resolve) => resolve(message.idToken));
    };

    window.addEventListener('message', onMessage);
    send({ v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.READY });
    send({ v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.NEED_IDENTITY });
    return () => window.removeEventListener('message', onMessage);
  }, [trusted, parentOrigin, allowedOrigins, send]);

  /** Asks the loader for a fresh ID token; resolves `null` for a guest or on timeout. */
  const requestIdentity = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        const timer = window.setTimeout(() => finish(null), IDENTITY_TIMEOUT_MS);
        function finish(idToken: string | null) {
          window.clearTimeout(timer);
          waitersRef.current = waitersRef.current.filter((w) => w !== finish);
          resolve(idToken);
        }
        waitersRef.current.push(finish);
        send({ v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.NEED_IDENTITY });
      }),
    [send],
  );

  /** `tokenType` of the latest identity message; `undefined` means `id_token`. */
  const getIdentityTokenType = useCallback(() => tokenTypeRef.current, []);

  return { trusted, send, identityToken, requestIdentity, getIdentityTokenType };
}
