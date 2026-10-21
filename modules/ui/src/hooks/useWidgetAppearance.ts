import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { WidgetLocale, WidgetTheme } from '@fe/domain';

/**
 * Applies the partner's `theme` and `locale`: sets the existing `data-theme` attribute
 * (`auto` follows `prefers-color-scheme`) and switches the i18next language.
 */
export function useWidgetAppearance(theme: WidgetTheme, locale: WidgetLocale) {
  const { i18n } = useTranslation();

  useEffect(() => {
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [i18n, locale]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme !== 'auto') {
      root.setAttribute('data-theme', theme);
      return;
    }
    if (typeof window.matchMedia !== 'function') {
      root.setAttribute('data-theme', 'light');
      return;
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => root.setAttribute('data-theme', query.matches ? 'dark' : 'light');
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [theme]);
}
