import type { Contact } from './content';

/**
 * Umesto widget-a prikazuje kontakt podatke (poziva se kad widget javi `onUnavailable`).
 * Gradi DOM bez `innerHTML`, pa tekst nikad ne postaje markup.
 */
export function renderContact(container: HTMLElement, contact: Contact, reason?: string): void {
  const doc = container.ownerDocument;
  const box = doc.createElement('div');
  box.className = 'contact-fallback';
  box.setAttribute('role', 'status');
  box.dataset.testid = 'contact-fallback';
  if (reason) box.dataset.reason = reason;

  const title = doc.createElement('h3');
  title.textContent = 'Online zakazivanje trenutno nije dostupno';
  const lead = doc.createElement('p');
  lead.textContent = `Za termin kontaktirajte ${contact.name} direktno:`;

  const list = doc.createElement('ul');
  const phone = doc.createElement('a');
  phone.href = `tel:${contact.phone.replace(/\s+/g, '')}`;
  phone.textContent = contact.phone;
  const email = doc.createElement('a');
  email.href = `mailto:${contact.email}`;
  email.textContent = contact.email;
  for (const node of [contact.address, phone, email]) {
    const item = doc.createElement('li');
    item.append(node);
    list.append(item);
  }

  box.append(title, lead, list);
  container.replaceChildren(box);
}
