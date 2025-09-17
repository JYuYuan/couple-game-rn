export type ThemeMode = 'system' | 'light' | 'dark';

export type LanguageMode = 'zh' | 'en' | 'ja';

export interface SoundSettings {
  globalMute: boolean;
  volume: number;
  bgmEnabled: boolean;
}

export interface SettingsState {
  themeMode: ThemeMode;
  languageMode: LanguageMode;
  soundSettings: SoundSettings;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguageMode: (mode: LanguageMode) => void;
  setSoundSettings: (settings: Partial<SoundSettings>) => void;
  reset: () => void;
}

export interface SettingsStorage {
  themeMode: ThemeMode;
  languageMode: LanguageMode;
  soundSettings: SoundSettings;
}