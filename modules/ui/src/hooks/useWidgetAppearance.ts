import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { WidgetLocale, WidgetTheme } from '@fe/domain';

/**
 * Applies the partner's `theme` and `locale`: sets the existing `data-theme` attribute
 * (`light` | `dark`) and switches the i18next language.
 */
export function useWidgetAppearance(theme: WidgetTheme, locale: WidgetLocale) {
  const { i18n } = useTranslation();

  useEffect(() => {
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [i18n, locale]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
}
