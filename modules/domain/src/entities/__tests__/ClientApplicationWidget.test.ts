import { describe, it, expect } from 'vitest';
import { toWidgetLocale, toWidgetTheme } from '../ClientApplicationWidget';

describe('toWidgetTheme', () => {
  it('passes through a recognized theme', () => {
    expect(toWidgetTheme('light')).toBe('light');
    expect(toWidgetTheme('dark')).toBe('dark');
    expect(toWidgetTheme('auto')).toBe('auto');
  });

  it('falls back to auto', () => {
    expect(toWidgetTheme('sepia')).toBe('auto');
    expect(toWidgetTheme(null)).toBe('auto');
    expect(toWidgetTheme(undefined)).toBe('auto');
  });
});

describe('toWidgetLocale', () => {
  it('passes through a recognized locale', () => {
    expect(toWidgetLocale('sr')).toBe('sr');
    expect(toWidgetLocale('en')).toBe('en');
  });

  it('falls back to sr', () => {
    expect(toWidgetLocale('de')).toBe('sr');
    expect(toWidgetLocale(null)).toBe('sr');
  });
});
