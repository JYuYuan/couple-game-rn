import { useColorScheme as useRNColorScheme } from 'react-native'
import { useSettingsStore } from '@/store/settingsStore'

export function useColorScheme() {
  const { themeMode } = useSettingsStore()
  const systemColorScheme = useRNColorScheme()
  // 根据用户设置决定颜色方案
  if (themeMode === 'system') {
    return systemColorScheme
  }

  return themeMode === 'dark' ? 'dark' : 'light'
}
