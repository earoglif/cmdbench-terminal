import { create } from 'zustand';

export type Language = 'ru' | 'en';
export type Theme = 'dark' | 'light';

export interface TerminalFontSettings {
  family: string;
  size: number;
  lineHeight: number;
}

interface SettingsState {
  language: Language;
  theme: Theme;
  terminalFont: TerminalFontSettings;
}

interface SettingsActions {
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  setTerminalFont: (font: TerminalFontSettings) => void;
  initialize: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

const LANGUAGE_STORAGE_KEY = 'app-language';
const THEME_STORAGE_KEY = 'app-theme';
const TERMINAL_FONT_STORAGE_KEY = 'app-terminal-font';

const DEFAULT_TERMINAL_FONT: TerminalFontSettings = {
  family: 'Consolas, Monaco, "Courier New", monospace',
  size: 14,
  lineHeight: 1.2,
};

const getStoredLanguage = (): Language => {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'ru' || stored === 'en') {
    return stored;
  }
  return 'ru';
};

const getStoredTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  return 'dark';
};

const getStoredTerminalFont = (): TerminalFontSettings => {
  const stored = localStorage.getItem(TERMINAL_FONT_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.family && typeof parsed.size === 'number') {
        // Ensure lineHeight exists, add default if missing
        return {
          ...parsed,
          lineHeight: typeof parsed.lineHeight === 'number' ? parsed.lineHeight : 1.2,
        };
      }
    } catch {
      // Invalid JSON, return default
    }
  }
  return DEFAULT_TERMINAL_FONT;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  language: 'ru',
  theme: 'dark',
  terminalFont: DEFAULT_TERMINAL_FONT,

  initialize: () => {
    const storedLanguage = getStoredLanguage();
    const storedTheme = getStoredTheme();
    const storedTerminalFont = getStoredTerminalFont();
    set({ 
      language: storedLanguage,
      theme: storedTheme,
      terminalFont: storedTerminalFont,
    });
  },

  setLanguage: (language: Language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    set({ language });
  },

  setTheme: (theme: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    set({ theme });
  },

  setTerminalFont: (font: TerminalFontSettings) => {
    localStorage.setItem(TERMINAL_FONT_STORAGE_KEY, JSON.stringify(font));
    set({ terminalFont: font });
  },
}));
