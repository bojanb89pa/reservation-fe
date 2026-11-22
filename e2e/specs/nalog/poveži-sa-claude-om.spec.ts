// Kontrolni tiket #99 (epic:99) · MCP M4: „Poveži sa Claude-om“
//
// Pokriva UI deo: stranica `/account/ai-assistants` (URL konektora sa kopiranjem,
// uputstvo u tri koraka, link na docs, sr/en) i prazna lista povezanih aplikacija.
//
// NIJE pokriveno (zavisi od spoljnog preduslova): ceo MCP tok, lista sa
// stvarnim saglasnostima, „Ukloni pristup“ i provera da refresh token više ne radi,
// kao i prikaz porekla „AI asistent“. Saglasnost CIMD klijenta nastaje samo kroz
// OAuth tok sa javno dostupnim HTTPS CIMD dokumentom koji auth-service mora da
// skine (u CI stack-u nedostupan), pa se saglasnost ne može napraviti kroz API
// bez upisa u bazu. Ista ograda je u mcp-server-autorizacija.spec.ts.

import { expect, test } from '../../fixtures/auth';

const PAGE_PATH = '/account/ai-assistants';

const TEXTS = {
  sr: {
    title: 'Poveži sa Claude-om',
    urlLabel: 'URL konektora',
    copy: 'Kopiraj URL',
    copied: 'Kopirano',
    stepsTitle: 'Kako da povežeš',
    steps: [
      'U Claude-u otvori Customize → Connectors → Add custom connector.',
      'Nalepi URL konektora iz polja iznad.',
      'Prijavi se Reserva nalogom i odobri pristup.',
    ],
    docs: 'Pročitaj kompletno uputstvo',
    connectedTitle: 'Povezane aplikacije',
    empty: 'Nijedna AI aplikacija nije povezana sa tvojim nalogom.',
  },
  en: {
    title: 'Connect with Claude',
    urlLabel: 'Connector URL',
    copy: 'Copy URL',
    copied: 'Copied',
    stepsTitle: 'How to connect',
    steps: [
      'In Claude open Customize → Connectors → Add custom connector.',
      'Paste the connector URL above.',
      'Sign in with your Reserva account and approve access.',
    ],
    docs: 'Read the full guide',
    connectedTitle: 'Connected apps',
    empty: 'No AI apps are connected to your account.',
  },
} as const;

test.describe('Poveži sa Claude-om', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  for (const lang of ['sr', 'en'] as const) {
    test(`stranica prikazuje URL, uputstvo i praznu listu (${lang})`, async ({ page, user, loginAs }) => {
      const t = TEXTS[lang];
      await loginAs(user);
      await page.evaluate((l) => localStorage.setItem('lang', l), lang);
      await page.goto(PAGE_PATH);

      await expect(page.getByRole('heading', { name: t.title, level: 1 })).toBeVisible();

      const url = page.getByLabel(t.urlLabel);
      await expect(url).toHaveValue(/^https:\/\/.+\/api\/mcp$/);

      await expect(page.getByRole('heading', { name: t.stepsTitle })).toBeVisible();
      for (const step of t.steps) {
        await expect(page.getByText(step)).toBeVisible();
      }
      await expect(page.getByRole('link', { name: t.docs })).toHaveAttribute(
        'href',
        'https://reserva-docs.bojanlab.com/guides/mcp/',
      );

      await expect(page.getByRole('heading', { name: t.connectedTitle })).toBeVisible();
      await expect(page.getByText(t.empty)).toBeVisible();
      await expect(page.getByTestId('connected-ai-app-item')).toHaveCount(0);
    });
  }

  test('dugme „Kopiraj URL“ kopira URL konektora u clipboard', async ({ page, user, loginAs }) => {
    await loginAs(user);
    await page.evaluate(() => localStorage.setItem('lang', 'sr'));
    await page.goto(PAGE_PATH);

    const shown = await page.getByLabel(TEXTS.sr.urlLabel).inputValue();
    await page.getByRole('button', { name: TEXTS.sr.copy }).click();
    await expect(page.getByRole('button', { name: TEXTS.sr.copied })).toBeVisible();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(shown);
  });
});
