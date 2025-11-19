export type ThemeMode = 'system' | 'light' | 'dark'

export type LanguageMode = 'zh' | 'en' | 'ja'

export type AvatarGender = 'man' | 'woman'

export interface SoundSettings {
  globalMute: boolean
  volume: number
  bgmEnabled: boolean
}

export interface NetworkSettings {
  enabled: boolean // 是否启用网络模式
  socketUrl: string // Socket 服务器地址
  lanMode: boolean // 是否启用局域网模式（仅 App）
  lanIP: string // 局域网服务器IP地址
  lanPort: number // 局域网TCP端口
}

export interface PlayerProfile {
  playerName: string // 玩家名称
  avatarId: string // 头像ID
  gender: AvatarGender // 性别
}

export interface AISettings {
  enabled: boolean // 是否启用AI功能
  apiUrl: string // AI API 地址
  apiKey: string // AI API Key
  apiModel: string // AI 模型
}

export interface SettingsState {
  playerId: string
  themeMode: ThemeMode
  languageMode: LanguageMode
  soundSettings: SoundSettings
  networkSettings: NetworkSettings
  playerProfile: PlayerProfile
  aiSettings: AISettings
  setThemeMode: (mode: ThemeMode) => void
  setLanguageMode: (mode: LanguageMode) => void
  setSoundSettings: (settings: Partial<SoundSettings>) => void
  setNetworkSettings: (settings: Partial<NetworkSettings>) => void
  setPlayerProfile: (profile: Partial<PlayerProfile>) => void
  setAISettings: (settings: Partial<AISettings>) => void
  reset: () => void
}
