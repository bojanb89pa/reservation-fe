import './styles.css';
import { mountAuthUi } from './authUi';
import { readConfig } from './config';
import { MAIN_CONTACT, NO_CONSENT_CONTACT, OTHER_BUSINESSES, WORKING_HOURS } from './content';
import { createIdentity } from './identity';
import { applyTheme, mountThemeToggle, readStoredTheme } from './theme';
import { bindIdentityRefresh, loadWidgetScript, mountWidget, setWidgetTheme } from './widget';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function renderStatic() {
  document
    .querySelector('#hours')
    ?.replaceChildren(
      ...WORKING_HOURS.map((h) =>
        el(
          'tr',
          {},
          el('th', { scope: 'row', textContent: h.days }),
          el('td', { textContent: h.time }),
        ),
      ),
    );
  document
    .querySelector('#main-contact')
    ?.replaceChildren(`${MAIN_CONTACT.address} · ${MAIN_CONTACT.phone}`);
  document.querySelector('#other-businesses')?.replaceChildren(
    ...OTHER_BUSINESSES.map((b) => {
      const card = el('article', { className: 'card' });
      card.dataset.testid = 'business-card';
      card.append(
        el('h3', { textContent: b.name }),
        el('p', { textContent: b.description }),
        el('p', { textContent: b.address }),
        el('a', { href: `tel:${b.phone.replace(/\s+/g, '')}`, textContent: b.phone }),
        el('a', { href: `mailto:${b.email}`, textContent: b.email }),
      );
      return card;
    }),
  );
}

async function start() {
  renderStatic();
  const theme = readStoredTheme();
  applyTheme(document, theme);
  const config = readConfig();
  const identity = await createIdentity(config.googleClientId);

  const auth = document.querySelector<HTMLElement>('#auth');
  if (auth) mountAuthUi(auth, identity);

  const toggle = document.querySelector<HTMLElement>('#theme-toggle');
  if (toggle) mountThemeToggle(toggle, theme, (next) => setWidgetTheme(window, next));

  bindIdentityRefresh(window, identity);
  mountWidget(window, document, {
    selector: '#reserva-widget',
    locationId: config.locationId,
    config,
    identity,
    fallbackContact: MAIN_CONTACT,
    theme,
  });
  if (config.noConsentLocationId) {
    mountWidget(window, document, {
      selector: '#reserva-widget-no-consent',
      locationId: config.noConsentLocationId,
      config,
      identity,
      fallbackContact: NO_CONSENT_CONTACT,
      theme,
    });
  } else {
    document.querySelector('#no-consent-section')?.remove();
  }
  loadWidgetScript(document, config.reservaOrigin);
}

void start();
