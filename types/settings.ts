export type ThemeMode = 'system' | 'light' | 'dark'

export type LanguageMode = 'zh' | 'en' | 'ja'

export interface SoundSettings {
  globalMute: boolean
  volume: number
  bgmEnabled: boolean
}

export interface NetworkSettings {
  enabled: boolean // 是否启用网络模式
  socketUrl: string // Socket 服务器地址
  lanMode: boolean // 是否启用局域网模式（仅 App）
}

export interface SettingsState {
  playerId: string
  themeMode: ThemeMode
  languageMode: LanguageMode
  soundSettings: SoundSettings
  networkSettings: NetworkSettings
  setThemeMode: (mode: ThemeMode) => void
  setLanguageMode: (mode: LanguageMode) => void
  setSoundSettings: (settings: Partial<SoundSettings>) => void
  setNetworkSettings: (settings: Partial<NetworkSettings>) => void
  reset: () => void
}

export interface SettingsStorage {
  themeMode: ThemeMode
  languageMode: LanguageMode
  soundSettings: SoundSettings
  networkSettings: NetworkSettings
}
