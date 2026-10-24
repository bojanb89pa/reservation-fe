export type SiteTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'demo-partner-theme';
export const DEFAULT_THEME: SiteTheme = 'light';

// Tekst prekidača (sajt je na srpskom, kao i ostatak demo sajta; bez i18n biblioteke).
export const THEME_LABELS: Record<SiteTheme, string> = {
  light: 'Svetla tema',
  dark: 'Tamna tema',
};

/** Sačuvani izbor; sistemska tema se namerno ne prati. Podrazumevano `light`. */
export function readStoredTheme(storage: Pick<Storage, 'getItem'> | null = safeStorage()): SiteTheme {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function storeTheme(theme: SiteTheme): void {
  try {
    safeStorage()?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // privatni režim / blokiran storage: izbor važi samo za ovu sesiju
  }
}

export function applyTheme(doc: Document, theme: SiteTheme): void {
  doc.documentElement.setAttribute('data-theme', theme);
}

/**
 * Prekidač u header-u. Dugme nosi ime teme na koju se prelazi; `onChange` dobija novu temu
 * (sajt je već primenjen i sačuvan) — main.ts tu zove `setTheme` na widget-u.
 */
export function mountThemeToggle(
  container: HTMLElement,
  initial: SiteTheme,
  onChange: (theme: SiteTheme) => void,
): void {
  const doc = container.ownerDocument;
  let current = initial;
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'theme-toggle';

  function render() {
    const next: SiteTheme = current === 'dark' ? 'light' : 'dark';
    button.textContent = THEME_LABELS[next];
    button.setAttribute('aria-label', `Prebaci na: ${THEME_LABELS[next].toLowerCase()}`);
  }

  button.addEventListener('click', () => {
    current = current === 'dark' ? 'light' : 'dark';
    applyTheme(doc, current);
    storeTheme(current);
    render();
    onChange(current);
  });
  render();
  container.replaceChildren(button);
}
