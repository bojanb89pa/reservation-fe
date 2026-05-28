import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import sr from './locales/sr';

const savedLang = typeof localStorage !== 'undefined' ? (localStorage.getItem('lang') ?? '') : '';
const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
const defaultLng = savedLang || (['en', 'sr'].includes(browserLang) ? browserLang : 'en');

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sr: { translation: sr },
  },
  lng: defaultLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
