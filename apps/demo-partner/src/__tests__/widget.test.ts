import { describe, expect, it } from 'vitest';
import { NO_CONSENT_CONTACT } from '../content';
import { loadWidgetScript, mountWidget } from '../widget';
import type { IdentityProvider } from '../identityProvider';

const config = {
  reservaOrigin: 'https://reserva.example',
  clientId: 'client-1',
  locationId: 'loc-1',
  noConsentLocationId: 'loc-2',
  googleClientId: 'g',
};

const identity = { getIdentityToken: () => 'tok' } as IdentityProvider;

type MountCommand = [string, string, Record<string, unknown>];

function mount(win: Window, doc: Document) {
  mountWidget(win, doc, {
    selector: '#w',
    locationId: 'loc-2',
    config,
    identity,
    fallbackContact: NO_CONSENT_CONTACT,
    theme: 'dark',
  });
  return (win as unknown as { ReservaWidget: MountCommand[] }).ReservaWidget[0];
}

describe('widget', () => {
  it('učitava widget.js sa Reserva origin-a', () => {
    const script = loadWidgetScript(document, 'https://reserva.example');
    expect(script.src).toBe('https://reserva.example/widget.js');
  });

  it('mount ide kroz window.ReservaWidget queue sa clientId, lokacijom i tokenom', () => {
    document.body.innerHTML = '<div id="w"></div>';
    const [name, selector, options] = mount(window, document);
    expect([name, selector]).toEqual(['mount', '#w']);
    expect(options).toMatchObject({ clientId: 'client-1', locationId: 'loc-2', theme: 'dark' });
    expect((options.getIdentityToken as () => string)()).toBe('tok');
  });

  it('onUnavailable umesto widget-a prikazuje kontakt', () => {
    document.body.innerHTML = '<div id="w"><iframe title="Reserva"></iframe></div>';
    const options = mount(window, document)[2];
    const onUnavailable = options.onUnavailable as (u: { reason: string }) => void;
    onUnavailable({ reason: 'CONSENT_NOT_APPROVED' });

    const box = document.querySelector('#w [data-testid="contact-fallback"]');
    expect(box?.getAttribute('data-reason')).toBe('CONSENT_NOT_APPROVED');
    expect(document.querySelector('#w iframe')).toBeNull();
    expect(box?.textContent).toContain(NO_CONSENT_CONTACT.phone);
    expect(box?.textContent).toContain(NO_CONSENT_CONTACT.email);
    expect(box?.textContent).toContain(NO_CONSENT_CONTACT.address);
  });
});
