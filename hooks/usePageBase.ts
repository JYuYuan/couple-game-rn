import { useColorScheme } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Colors } from '@/constants/theme'

/**
 * 页面基础 Hook，统一管理常用的页面逻辑
 * 包括主题、颜色、国际化和路由功能
 */
export function usePageBase() {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()
  const router = useRouter()

  return {
    colorScheme,
    colors,
    t,
    router,
  }
}
