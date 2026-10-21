/** Sadržaj izmišljenog partnera. Svi kontakt podaci su izmišljeni. */
export interface Contact {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface Hours {
  days: string;
  time: string;
}

export const WORKING_HOURS: Hours[] = [
  { days: 'Ponedeljak – Petak', time: '09:00 – 20:00' },
  { days: 'Subota', time: '10:00 – 17:00' },
  { days: 'Nedelja', time: 'Zatvoreno' },
];

export const MAIN_CONTACT: Contact = {
  name: 'Beogradski Berberin – Dorćol',
  address: 'Strahinjića Bana 12, Beograd',
  phone: '+381 11 555 0101',
  email: 'dorcol@beogradski-berberin.example',
};

export const NO_CONSENT_CONTACT: Contact = {
  name: 'Beogradski Berberin – Zemun',
  address: 'Glavna 8, Zemun',
  phone: '+381 11 555 0102',
  email: 'zemun@beogradski-berberin.example',
};

/** Biznisi bez Reserva naloga: samo kontakt podaci. */
export const OTHER_BUSINESSES: (Contact & { description: string })[] = [
  {
    name: 'Brico Frizerski Salon',
    description: 'Žensko šišanje i bojenje u srcu Vračara.',
    address: 'Njegoševa 40, Beograd',
    phone: '+381 11 555 0201',
    email: 'info@brico.example',
  },
  {
    name: 'Studio Lepota',
    description: 'Manikir, pedikir i nega lica.',
    address: 'Bulevar kralja Aleksandra 100, Beograd',
    phone: '+381 11 555 0202',
    email: 'zakazivanje@studiolepota.example',
  },
  {
    name: 'Barber Corner',
    description: 'Klasično brijanje i uređivanje brade.',
    address: 'Knez Mihailova 5, Beograd',
    phone: '+381 11 555 0203',
    email: 'hello@barbercorner.example',
  },
];
