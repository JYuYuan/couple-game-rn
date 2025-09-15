import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";
import {LanguageMode, SettingsState, ThemeMode} from '@/types/settings';
import {getStorage} from "@/utils/storage";

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            themeMode: "system" as ThemeMode,
            languageMode: "zh" as LanguageMode,
            setThemeMode: (themeMode: ThemeMode) => set({themeMode}),
            setLanguageMode: (languageMode: LanguageMode) => set({languageMode}),
            reset: () => set({
                themeMode: "system" as ThemeMode,
                languageMode: "zh" as LanguageMode
            }),
        }),
        {
            name: "settings-storage",
            storage: createJSONStorage(getStorage),
        }
    )
);
