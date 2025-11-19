import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  AISettings,
  LanguageMode,
  NetworkSettings,
  PlayerProfile,
  SettingsState,
  SoundSettings,
  ThemeMode,
} from '@/types/settings'
import { getStorage } from '@/utils/storage'
import { generateRoomId } from '@/utils'

const defaultSoundSettings: SoundSettings = {
  globalMute: false,
  volume: 0.5,
  bgmEnabled: true,
}

const defaultNetworkSettings: NetworkSettings = {
  enabled: false,
  socketUrl: 'https://qq.cpflying.top',
  lanMode: false,
  lanIP: '',
  lanPort: 8080,
}

const defaultPlayerProfile: PlayerProfile = {
  playerName: '',
  avatarId: '',
  gender: 'man',
}

const defaultAISettings: AISettings = {
  enabled: false,
  apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
  apiKey: '',
  apiModel: 'Qwen/QwQ-32B',
}

type SettingsStoreType = () => SettingsState
let settingsStoreInstance: SettingsStoreType | null = null

export const useSettingsStore = (() => {
  if (settingsStoreInstance) {
    return settingsStoreInstance
  }

  settingsStoreInstance = create<SettingsState>()(
    persist(
      (set) => ({
        playerId: generateRoomId(),
        themeMode: 'system' as ThemeMode,
        languageMode: 'zh' as LanguageMode,
        soundSettings: defaultSoundSettings,
        networkSettings: defaultNetworkSettings,
        playerProfile: defaultPlayerProfile,
        aiSettings: defaultAISettings,
        setThemeMode: (themeMode: ThemeMode) => set({ themeMode }),
        setLanguageMode: (languageMode: LanguageMode) => set({ languageMode }),
        setSoundSettings: (settings: Partial<SoundSettings>) =>
          set((state) => ({
            soundSettings: { ...state.soundSettings, ...settings },
          })),
        setNetworkSettings: (settings: Partial<NetworkSettings>) =>
          set((state) => ({
            networkSettings: { ...state.networkSettings, ...settings },
          })),
        setPlayerProfile: (profile: Partial<PlayerProfile>) =>
          set((state) => ({
            playerProfile: { ...state.playerProfile, ...profile },
          })),
        setAISettings: (settings: Partial<AISettings>) =>
          set((state) => ({
            aiSettings: { ...state.aiSettings, ...settings },
          })),
        reset: () =>
          set({
            themeMode: 'system' as ThemeMode,
            languageMode: 'zh' as LanguageMode,
            soundSettings: defaultSoundSettings,
            networkSettings: defaultNetworkSettings,
            playerProfile: defaultPlayerProfile,
            aiSettings: defaultAISettings,
          }),
      }),
      {
        name: 'settings-storage',
        storage: createJSONStorage(() => getStorage()),
        partialize: (state) => ({
          themeMode: state.themeMode,
          playerId: state.playerId,
          languageMode: state.languageMode,
          soundSettings: state.soundSettings,
          networkSettings: state.networkSettings,
          playerProfile: state.playerProfile,
          aiSettings: state.aiSettings,
        }),
      },
    ),
  )

  return settingsStoreInstance
})()
