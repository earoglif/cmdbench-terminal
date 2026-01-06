import { create } from 'zustand';

export type Language = 'ru' | 'en';

interface SettingsState {
  language: Language;
}

interface SettingsActions {
  setLanguage: (language: Language) => void;
  initialize: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

const LANGUAGE_STORAGE_KEY = 'app-language';

const getStoredLanguage = (): Language => {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'ru' || stored === 'en') {
    return stored;
  }
  return 'ru';
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  language: 'ru',

  initialize: () => {
    const storedLanguage = getStoredLanguage();
    set({ language: storedLanguage });
  },

  setLanguage: (language: Language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    set({ language });
  },
}));
