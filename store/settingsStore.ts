import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { LanguageMode, SettingsState, SoundSettings, ThemeMode } from '@/types/settings'
import { getStorage } from '@/utils/storage'
import { generateRoomId } from '@/utils'

const defaultSoundSettings: SoundSettings = {
  globalMute: false,
  volume: 0.5,
  bgmEnabled: true,
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
        setThemeMode: (themeMode: ThemeMode) => set({ themeMode }),
        setLanguageMode: (languageMode: LanguageMode) => set({ languageMode }),
        setSoundSettings: (settings: Partial<SoundSettings>) =>
          set((state) => ({
            soundSettings: { ...state.soundSettings, ...settings },
          })),
        reset: () =>
          set({
            themeMode: 'system' as ThemeMode,
            languageMode: 'zh' as LanguageMode,
            soundSettings: defaultSoundSettings,
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
        }),
      },
    ),
  )

  return settingsStoreInstance
})()
