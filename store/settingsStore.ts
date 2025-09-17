import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";
import {LanguageMode, SettingsState, SoundSettings, ThemeMode} from '@/types/settings';
import {getStorage} from "@/utils/storage";

const defaultSoundSettings: SoundSettings = {
    globalMute: false,
    volume: 0.5,
    bgmEnabled: true,
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            themeMode: "system" as ThemeMode,
            languageMode: "zh" as LanguageMode,
            soundSettings: defaultSoundSettings,
            setThemeMode: (themeMode: ThemeMode) => set({themeMode}),
            setLanguageMode: (languageMode: LanguageMode) => set({languageMode}),
            setSoundSettings: (settings: Partial<SoundSettings>) =>
                set((state) => ({
                    soundSettings: { ...state.soundSettings, ...settings }
                })),
            reset: () => set({
                themeMode: "system" as ThemeMode,
                languageMode: "zh" as LanguageMode,
                soundSettings: defaultSoundSettings,
            }),
        }),
        {
            name: "settings-storage",
            storage: createJSONStorage(getStorage),
        }
    )
);
