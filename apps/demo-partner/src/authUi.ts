import type { IdentityProvider } from './identityProvider';

/** Crta stanje prijave: login dugme za gosta, ime i „Odjavi se“ za prijavljenog. */
export function mountAuthUi(container: HTMLElement, identity: IdentityProvider): void {
  const doc = container.ownerDocument;

  function render() {
    const label = identity.getUserLabel();
    if (!label) {
      const slot = doc.createElement('div');
      container.replaceChildren(slot);
      identity.renderLoginButton(slot);
      return;
    }
    const name = doc.createElement('span');
    name.className = 'auth-user';
    name.textContent = label;
    const out = doc.createElement('button');
    out.type = 'button';
    out.textContent = 'Odjavi se';
    out.addEventListener('click', () => identity.signOut());
    container.replaceChildren(name, out);
  }

  identity.subscribe(render);
  render();
}
