import { describe, it, expect } from 'vitest';
import { toLoginTheme, toLoginLanguage } from '../LoginPreferences';

describe('toLoginTheme', () => {
  it('passes through a recognized theme', () => {
    expect(toLoginTheme('dark')).toBe('dark');
    expect(toLoginTheme('light')).toBe('light');
  });

  it('falls back to light for unrecognized or missing values', () => {
    expect(toLoginTheme('sepia')).toBe('light');
    expect(toLoginTheme(null)).toBe('light');
    expect(toLoginTheme(undefined)).toBe('light');
  });
});

describe('toLoginLanguage', () => {
  it('passes through a recognized language', () => {
    expect(toLoginLanguage('sr')).toBe('sr');
    expect(toLoginLanguage('en')).toBe('en');
  });

  it('falls back to en for unrecognized or missing values', () => {
    expect(toLoginLanguage('de')).toBe('en');
    expect(toLoginLanguage(null)).toBe('en');
    expect(toLoginLanguage(undefined)).toBe('en');
  });
});
