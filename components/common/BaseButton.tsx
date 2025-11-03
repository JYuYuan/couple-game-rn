import React, { ReactNode } from 'react'
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  useColorScheme,
  ViewStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
export type ButtonSize = 'small' | 'medium' | 'large'

export interface BaseButtonProps {
  /** 按钮文本 */
  title?: string
  /** 按钮变体 */
  variant?: ButtonVariant
  /** 按钮大小 */
  size?: ButtonSize
  /** 是否使用渐变背景 */
  gradient?: boolean
  /** 渐变颜色数组 */
  gradientColors?: string[]
  /** 图标名称 */
  iconName?: keyof typeof Ionicons.glyphMap
  /** 图标大小 */
  iconSize?: number
  /** 图标颜色 */
  iconColor?: string
  /** 图标位置 */
  iconPosition?: 'left' | 'right'
  /** 是否禁用 */
  disabled?: boolean
  /** 是否加载中 */
  loading?: boolean
  /** 点击事件 */
  onPress?: () => void
  /** 自定义按钮样式 */
  style?: StyleProp<ViewStyle>
  /** 自定义文本样式 */
  textStyle?: TextStyle
  /** 自定义内容 */
  children?: ReactNode
  /** 按下时的透明度 */
  activeOpacity?: number
}

/**
 * 通用按钮基础组件
 *
 * 提供统一的按钮样式和行为，支持：
 * - 多种变体（primary、secondary、success、danger等）
 * - 多种尺寸（small、medium、large）
 * - 渐变背景
 * - 图标支持
 * - 加载状态
 * - 禁用状态
 *
 * @example
 * ```tsx
 * <BaseButton
 *   title="确认"
 *   variant="primary"
 *   gradient={true}
 *   iconName="checkmark"
 *   onPress={() => console.log('clicked')}
 * />
 * ```
 */
export const BaseButton: React.FC<BaseButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  gradient = false,
  gradientColors,
  iconName,
  iconSize,
  iconColor,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  onPress,
  style,
  textStyle,
  children,
  activeOpacity = 0.8,
}) => {
  const colorScheme = useColorScheme() ?? 'light'

  // 获取变体颜色
  const getVariantColors = (isGradient: boolean): string | string[] => {
    const colors = {
      primary: isGradient
        ? gradientColors || ['#007AFF', '#0056CC']
        : colorScheme === 'dark'
          ? '#007AFF'
          : '#007AFF',
      secondary: isGradient
        ? gradientColors || ['#8E8E93', '#6D6D70']
        : colorScheme === 'dark'
          ? '#8E8E93'
          : '#8E8E93',
      success: isGradient ? gradientColors || ['#4CAF50', '#66BB6A'] : '#4CAF50',
      danger: isGradient ? gradientColors || ['#FF3B30', '#FF6B6B'] : '#FF3B30',
      warning: isGradient ? gradientColors || ['#FF9500', '#FFB84D'] : '#FF9500',
      info: isGradient ? gradientColors || ['#5AC8FA', '#7DD3FC'] : '#5AC8FA',
    }
    return colors[variant]
  }

  // 获取尺寸样式
  const getSizeStyles = () => {
    const sizes = {
      small: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        fontSize: 14,
        iconSize: 16,
      },
      medium: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        fontSize: 16,
        iconSize: 20,
      },
      large: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        fontSize: 18,
        iconSize: 24,
      },
    }
    return sizes[size]
  }

  const variantColors = getVariantColors(gradient)
  const sizeStyles = getSizeStyles()
  const finalIconSize = iconSize || sizeStyles.iconSize
  const finalIconColor =
    iconColor ||
    (variant === 'secondary' ? (colorScheme === 'dark' ? '#FFFFFF' : '#000000') : '#FFFFFF')

  const buttonContent = (
    <>
      {iconName && iconPosition === 'left' && (
        <Ionicons
          name={iconName}
          size={finalIconSize}
          color={finalIconColor}
          style={[styles.icon, title ? styles.iconLeft : null]}
        />
      )}
      {title && (
        <Text
          style={[
            styles.text,
            { fontSize: sizeStyles.fontSize },
            variant === 'secondary'
              ? colorScheme === 'dark'
                ? styles.textSecondaryDark
                : styles.textSecondaryLight
              : styles.textPrimary,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
      {iconName && iconPosition === 'right' && (
        <Ionicons
          name={iconName}
          size={finalIconSize}
          color={finalIconColor}
          style={[styles.icon, title ? styles.iconRight : null]}
        />
      )}
      {children}
    </>
  )

  const buttonStyle = [
    styles.button,
    {
      paddingHorizontal: sizeStyles.paddingHorizontal,
      paddingVertical: sizeStyles.paddingVertical,
      borderRadius: sizeStyles.borderRadius,
    },
    !gradient && {
      backgroundColor: typeof variantColors === 'string' ? variantColors : variantColors[0],
    },
    disabled && styles.disabled,
    style,
  ]

  if (gradient && Array.isArray(variantColors)) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={activeOpacity}
        style={[buttonStyle, { backgroundColor: 'transparent' }]}
      >
        <LinearGradient
          colors={
            Array.isArray(variantColors)
              ? (variantColors as [string, string, ...string[]])
              : [variantColors, variantColors]
          }
          style={[
            styles.gradient,
            {
              borderRadius: sizeStyles.borderRadius,
            },
          ]}
        >
          {buttonContent}
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={activeOpacity}
      style={buttonStyle}
    >
      {buttonContent}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondaryLight: {
    color: '#000000',
  },
  textSecondaryDark: {
    color: '#FFFFFF',
  },
  icon: {
    // 基础图标样式
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
})

export default BaseButton
