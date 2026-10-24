import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { WIDGET_PROTOCOL_VERSION, WidgetMessageType } from '@fe/domain';
import { useWidgetBridge } from '../useWidgetBridge';

const PARTNER = 'https://partner.test';

function identityMessage(origin: string, idToken: string | null) {
  window.dispatchEvent(
    new MessageEvent('message', {
      origin,
      source: window.parent,
      data: { v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.IDENTITY, idToken },
    }),
  );
}

describe('useWidgetBridge (iframe side)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores messages from an origin outside allowedOrigins', () => {
    const { result } = renderHook(() =>
      useWidgetBridge({ parentOrigin: PARTNER, allowedOrigins: [PARTNER] }),
    );
    act(() => identityMessage('https://evil.test', 'stolen'));
    expect(result.current.identityToken).toBeUndefined();
    act(() => identityMessage(PARTNER, 'good'));
    expect(result.current.identityToken).toBe('good');
  });

  it('ignores identity from an allowed origin that is not the embedding parent', () => {
    const { result } = renderHook(() =>
      useWidgetBridge({ parentOrigin: PARTNER, allowedOrigins: [PARTNER, 'https://other.test'] }),
    );
    act(() => identityMessage('https://other.test', 'other'));
    expect(result.current.identityToken).toBeUndefined();
  });

  it('stays silent and untrusted when the parent origin is not allowed', () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage');
    const { result } = renderHook(() =>
      useWidgetBridge({ parentOrigin: 'https://evil.test', allowedOrigins: [PARTNER] }),
    );
    expect(result.current.trusted).toBe(false);
    act(() => identityMessage('https://evil.test', 'x'));
    expect(result.current.identityToken).toBeUndefined();
    act(() => result.current.send({ v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.READY }));
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('announces ready and need-identity to the exact parent origin, never "*"', () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    renderHook(() => useWidgetBridge({ parentOrigin: PARTNER, allowedOrigins: [PARTNER] }));
    expect(postMessage).toHaveBeenCalledWith(
      { v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.READY },
      PARTNER,
    );
    expect(postMessage).toHaveBeenCalledWith(
      { v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.NEED_IDENTITY },
      PARTNER,
    );
    expect(postMessage.mock.calls.map((call) => call[1])).not.toContain('*');
  });

  it('remembers the tokenType of the identity message', () => {
    const { result } = renderHook(() =>
      useWidgetBridge({ parentOrigin: PARTNER, allowedOrigins: [PARTNER] }),
    );
    expect(result.current.getIdentityTokenType()).toBeUndefined();
    act(() =>
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: PARTNER,
          source: window.parent,
          data: {
            v: WIDGET_PROTOCOL_VERSION,
            type: WidgetMessageType.IDENTITY,
            idToken: 'assertion',
            tokenType: 'jwt',
          },
        }),
      ),
    );
    expect(result.current.getIdentityTokenType()).toBe('jwt');
    act(() => identityMessage(PARTNER, 'plain'));
    expect(result.current.getIdentityTokenType()).toBeUndefined();
  });

  it('sends sign-in-required to the exact parent origin', () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useWidgetBridge({ parentOrigin: PARTNER, allowedOrigins: [PARTNER] }),
    );
    act(() =>
      result.current.send({ v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.SIGN_IN_REQUIRED }),
    );
    expect(postMessage).toHaveBeenCalledWith(
      { v: WIDGET_PROTOCOL_VERSION, type: WidgetMessageType.SIGN_IN_REQUIRED },
      PARTNER,
    );
  });

  it('requestIdentity resolves with the next identity message', async () => {
    vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useWidgetBridge({ parentOrigin: PARTNER, allowedOrigins: [PARTNER] }),
    );
    let pending!: Promise<string | null>;
    act(() => {
      pending = result.current.requestIdentity();
    });
    act(() => identityMessage(PARTNER, 'fresh'));
    await expect(pending).resolves.toBe('fresh');
  });
});
