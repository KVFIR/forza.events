import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';

export const LANGUAGE_STORAGE_KEY = 'forza.language';
export const SUPPORTED_LANGUAGES = ['en', 'ru'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function storedLanguage(): AppLanguage | null {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (raw === 'en' || raw === 'ru') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

/** First visit (no saved preference): match browser / system locale. */
export function detectBrowserLanguage(): AppLanguage {
  const tags =
    typeof navigator !== 'undefined' && navigator.languages?.length
      ? navigator.languages
      : typeof navigator !== 'undefined' && navigator.language
        ? [navigator.language]
        : [];

  for (const tag of tags) {
    const base = tag.split('-')[0]?.toLowerCase();
    if (base === 'ru') return 'ru';
    if (base === 'en') return 'en';
  }
  return 'en';
}

function resolveInitialLanguage(): AppLanguage {
  return storedLanguage() ?? detectBrowserLanguage();
}

function applyDocumentLanguage(lng: string) {
  document.documentElement.lang = lng;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: {translation: en},
    ru: {translation: ru},
  },
  lng: resolveInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {escapeValue: false},
  // Plural rules for Russian (and other non-English locales).
  compatibilityJSON: 'v4',
});

applyDocumentLanguage(i18n.language);

i18n.on('languageChanged', (lng) => {
  applyDocumentLanguage(lng);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
});

export default i18n;
