import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import fr from './locales/fr.json';
import en from './locales/en.json';

/**
 * F01 — Langues.
 * Lot 1 : français + anglais. Pour ajouter l'allemand ou l'italien, il suffit
 * de créer `locales/de.json` / `locales/it.json` et de les déclarer ici :
 * aucun autre fichier n'est à modifier.
 */
export const resources = {
  fr: { translation: fr },
  en: { translation: en },
} as const;

export type Language = keyof typeof resources;
export const SUPPORTED_LANGUAGES = Object.keys(resources) as Language[];
export const FALLBACK_LANGUAGE: Language = 'en';

export const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
};

export function isSupported(code: string | null | undefined): code is Language {
  return !!code && (SUPPORTED_LANGUAGES as string[]).includes(code);
}

/** Langue du téléphone si elle est disponible, sinon l'anglais. */
export function detectDeviceLanguage(): Language {
  for (const locale of getLocales()) {
    if (isSupported(locale.languageCode)) return locale.languageCode;
  }
  return FALLBACK_LANGUAGE;
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false },
  initAsync: false,
});

export default i18n;
