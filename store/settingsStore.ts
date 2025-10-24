import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
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
  socketUrl: 'http://localhost:3001',
  lanMode: false,
  lanIP: '',
  lanPort: 8080,
}

const defaultPlayerProfile: PlayerProfile = {
  playerName: '',
  avatarId: '',
  gender: 'man',
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
        reset: () =>
          set({
            themeMode: 'system' as ThemeMode,
            languageMode: 'zh' as LanguageMode,
            soundSettings: defaultSoundSettings,
            networkSettings: defaultNetworkSettings,
            playerProfile: defaultPlayerProfile,
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
        }),
      },
    ),
  )

  return settingsStoreInstance
})()
