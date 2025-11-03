import { useColorScheme } from 'react-native'
import { useMemo } from 'react'

export interface ThemeColors {
  // 基础颜色
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string

  // 状态颜色
  success: string
  warning: string
  error: string
  info: string

  // 特殊颜色
  shadow: string
  overlay: string
}

const lightTheme: ThemeColors = {
  primary: '#007AFF',
  secondary: '#8E8E93',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
  success: '#4CAF50',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
}

const darkTheme: ThemeColors = {
  primary: '#007AFF',
  secondary: '#8E8E93',
  background: '#000000',
  surface: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  success: '#4CAF50',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
}

/**
 * 主题Hook
 *
 * 提供统一的主题管理，包括：
 * - 自动检测系统主题
 * - 提供完整的颜色调色板
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
  const systemColorScheme = useColorScheme()
  const colorScheme = systemColorScheme ?? 'light'

  const colors = useMemo(() => {
    return colorScheme === 'dark' ? darkTheme : lightTheme
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
  const colors = colorScheme === 'dark' ? darkTheme : lightTheme

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
