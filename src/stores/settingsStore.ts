import { create } from 'zustand';

export type Language = 'ru' | 'en';

interface SettingsState {
  language: Language;
  remoteControlEnabled: boolean;
}

interface SettingsActions {
  setLanguage: (language: Language) => void;
  setRemoteControlEnabled: (enabled: boolean) => void;
  initialize: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

const LANGUAGE_STORAGE_KEY = 'app-language';
const REMOTE_CONTROL_STORAGE_KEY = 'remote-control-enabled';

const getStoredLanguage = (): Language => {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'ru' || stored === 'en') {
    return stored;
  }
  return 'ru';
};

const getStoredRemoteControl = (): boolean => {
  const stored = localStorage.getItem(REMOTE_CONTROL_STORAGE_KEY);
  return stored === 'true';
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  language: 'ru',
  remoteControlEnabled: false,

  initialize: () => {
    const storedLanguage = getStoredLanguage();
    const storedRemoteControl = getStoredRemoteControl();
    set({ language: storedLanguage, remoteControlEnabled: storedRemoteControl });
  },

  setLanguage: (language: Language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    set({ language });
  },

  setRemoteControlEnabled: (enabled: boolean) => {
    localStorage.setItem(REMOTE_CONTROL_STORAGE_KEY, String(enabled));
    set({ remoteControlEnabled: enabled });
  },
}));

