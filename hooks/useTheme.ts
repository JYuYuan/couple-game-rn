import { useMemo } from 'react'
import { Colors } from '@/constants/theme'
import { useColorScheme as useAppColorScheme } from '@/hooks/use-color-scheme'

// 导出颜色类型，基于 Colors 对象
export type ThemeColors = typeof Colors.light

/**
 * 主题Hook - 统一使用 @/constants/theme 中的 Colors
 *
 * 提供统一的主题管理，包括：
 * - 自动检测系统主题
 * - 提供完整的颜色调色板（来自 constants/theme.ts）
 * - 主题切换支持
 * - 类型安全的颜色访问
 *
 * @returns {Object} 主题对象
 * @returns {string} colorScheme - 当前主题模式 ('light' | 'dark')
 * @returns {ThemeColors} colors - 主题颜色对象
 * @returns {boolean} isDark - 是否为深色主题
 *
 * @example
 * ```tsx
 * const { colors, isDark, colorScheme } = useTheme()
 *
 * const styles = StyleSheet.create({
 *   container: {
 *     backgroundColor: colors.background,
 *     borderColor: colors.border,
 *   },
 *   text: {
 *     color: colors.text,
 *   },
 * })
 * ```
 */
export const useTheme = () => {
  const systemColorScheme = useAppColorScheme()
  const colorScheme = systemColorScheme ?? 'light'

  const colors = useMemo(() => {
    return colorScheme === 'dark' ? Colors.dark : Colors.light
  }, [colorScheme])

  const isDark = colorScheme === 'dark'

  return {
    colorScheme,
    colors,
    isDark,
  }
}

/**
 * 获取主题相关的样式工具函数
 *
 * @param colorScheme - 主题模式
 * @returns 样式工具对象
 */
export const getThemeStyles = (colorScheme: 'light' | 'dark') => {
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light

  return {
    colors,
    shadowStyle: {
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    borderStyle: {
      borderColor: colors.border,
      borderWidth: 1,
    },
  }
}

export default useTheme
