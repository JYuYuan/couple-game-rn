export type ThemeMode = 'system' | 'light' | 'dark';

export type LanguageMode = 'zh' | 'en' | 'ja';

export interface SettingsState {
  themeMode: ThemeMode;
  languageMode: LanguageMode;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguageMode: (mode: LanguageMode) => void;
  reset: () => void;
}

export interface SettingsStorage {
  themeMode: ThemeMode;
  languageMode: LanguageMode;
}