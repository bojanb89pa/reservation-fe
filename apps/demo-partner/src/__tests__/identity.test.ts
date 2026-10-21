import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIdentity } from '../identity';
import { createGoogleIdentity } from '../googleIdentity';
import { createTestIdentity, type TestWindow } from '../testIdentity';
import { bindIdentityRefresh } from '../widget';

function jwt(claims: object): string {
  return `h.${btoa(JSON.stringify(claims))}.s`;
}

function fakeGoogle() {
  let callback: (r: { credential: string }) => void = () => undefined;
  const id = {
    initialize: vi.fn((c: { callback: typeof callback }) => {
      callback = c.callback;
    }),
    renderButton: vi.fn(),
    disableAutoSelect: vi.fn(),
  };
  (window as unknown as { google: unknown }).google = { accounts: { id } };
  return { id, signIn: (credential: string) => callback({ credential }) };
}

afterEach(() => {
  delete (window as unknown as { google?: unknown }).google;
  delete (window as TestWindow).__DEMO_ID_TOKEN__;
  vi.unstubAllEnvs();
  window.history.replaceState(null, '', '/');
});

describe('Google identity', () => {
  it('prosleđuje ID token posle prijave i čisti ga na odjavi', async () => {
    const google = fakeGoogle();
    const identity = createGoogleIdentity('client-id', window, document);
    const listener = vi.fn();
    identity.subscribe(listener);

    expect(identity.getIdentityToken()).toBeNull();
    identity.renderLoginButton(document.createElement('div'));
    await vi.waitFor(() => expect(google.id.renderButton).toHaveBeenCalled());
    expect(google.id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'client-id' }),
    );

    const token = jwt({ name: 'Mika', exp: Math.floor(Date.now() / 1000) + 600 });
    google.signIn(token);
    expect(identity.getIdentityToken()).toBe(token);
    expect(identity.getUserLabel()).toBe('Mika');
    expect(listener).toHaveBeenCalledTimes(1);

    identity.signOut();
    expect(identity.getIdentityToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('istekao token tretira kao gosta', async () => {
    const google = fakeGoogle();
    const identity = createGoogleIdentity('client-id', window, document);
    identity.renderLoginButton(document.createElement('div'));
    await vi.waitFor(() => expect(google.id.renderButton).toHaveBeenCalled());
    google.signIn(jwt({ exp: 1 }));
    expect(identity.getIdentityToken()).toBeNull();
  });
});

describe('test identity', () => {
  it('uzima token iz window promenljive i prijavljuje korisnika od starta', () => {
    (window as TestWindow).__DEMO_ID_TOKEN__ = jwt({ email: 'a@b.c' });
    const identity = createTestIdentity(window);
    expect(identity.getIdentityToken()).toBe(jwt({ email: 'a@b.c' }));
    expect(identity.getUserLabel()).toBe('a@b.c');
  });

  it('uzima token iz query parametra', () => {
    window.history.replaceState(null, '', '/?idToken=abc');
    expect(createTestIdentity(window).getIdentityToken()).toBe('abc');
  });

  it('bez tokena je gost, a dugme prijavljuje kad token stigne', () => {
    const identity = createTestIdentity(window);
    expect(identity.getIdentityToken()).toBeNull();
    const slot = document.createElement('div');
    identity.renderLoginButton(slot);
    (window as TestWindow).__DEMO_ID_TOKEN__ = 'tok';
    slot.querySelector('button')?.click();
    expect(identity.getIdentityToken()).toBe('tok');
    identity.signOut();
    expect(identity.getIdentityToken()).toBeNull();
  });
});

describe('createIdentity', () => {
  it('podrazumevano koristi Google', async () => {
    fakeGoogle();
    (window as TestWindow).__DEMO_ID_TOKEN__ = 'tok';
    const identity = await createIdentity('client-id');
    expect(identity.getIdentityToken()).toBeNull();
  });

  it('u test režimu koristi test token', async () => {
    vi.stubEnv('VITE_DEMO_IDENTITY', 'test');
    (window as TestWindow).__DEMO_ID_TOKEN__ = 'tok';
    const identity = await createIdentity('client-id');
    expect(identity.getIdentityToken()).toBe('tok');
  });
});

describe('refreshIdentity', () => {
  it('login i logout šalju refreshIdentity u widget queue', () => {
    (window as TestWindow).__DEMO_ID_TOKEN__ = 'tok';
    const identity = createTestIdentity(window);
    const win = { ReservaWidget: [] as unknown[][] } as unknown as Window;
    bindIdentityRefresh(win, identity);

    identity.signOut();
    const slot = document.createElement('div');
    identity.renderLoginButton(slot);
    slot.querySelector('button')?.click();

    expect((win as unknown as { ReservaWidget: unknown[][] }).ReservaWidget).toEqual([
      ['refreshIdentity'],
      ['refreshIdentity'],
    ]);
  });
});
