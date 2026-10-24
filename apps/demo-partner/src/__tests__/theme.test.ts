import { beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, mountThemeToggle, readStoredTheme } from '../theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="t"></div>';
    document.documentElement.setAttribute('data-theme', 'light');
  });

  it('podrazumevano je light, a nevažeća vrednost se ignoriše', () => {
    expect(readStoredTheme()).toBe('light');
    localStorage.setItem(THEME_STORAGE_KEY, 'auto');
    expect(readStoredTheme()).toBe('light');
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('ne pada kad je storage nedostupan', () => {
    expect(
      readStoredTheme({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe('light');
  });

  it('prekidač primenjuje, pamti i javi temu', () => {
    const onChange = vi.fn();
    mountThemeToggle(document.querySelector('#t')!, 'light', onChange);
    const button = document.querySelector('button')!;
    button.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(onChange).toHaveBeenCalledWith('dark');
    button.click();
    expect(onChange).toHaveBeenLastCalledWith('light');
  });
});
