import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru/translation.json';
import en from './locales/en/translation.json';

const resources = {
  en: {
    translation: en,
  },
  ru: {
    translation: ru,
  },
};

const getStoredLanguage = (): string => {
  const stored = localStorage.getItem('app-language');
  if (stored === 'ru' || stored === 'en') {
    return stored;
  }
  return 'ru';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

