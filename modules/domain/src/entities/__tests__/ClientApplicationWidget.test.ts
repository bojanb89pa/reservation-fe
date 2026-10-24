import { describe, it, expect } from 'vitest';
import { toWidgetLocale, toWidgetTheme } from '../ClientApplicationWidget';

describe('toWidgetTheme', () => {
  it('passes through a recognized theme', () => {
    expect(toWidgetTheme('light')).toBe('light');
    expect(toWidgetTheme('dark')).toBe('dark');
  });

  it('falls back to light, including for the removed auto', () => {
    expect(toWidgetTheme('auto')).toBe('light');
    expect(toWidgetTheme('sepia')).toBe('light');
    expect(toWidgetTheme(null)).toBe('light');
    expect(toWidgetTheme(undefined)).toBe('light');
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
