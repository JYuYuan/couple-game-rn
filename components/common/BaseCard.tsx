import React, { ReactNode } from 'react'
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export interface BaseCardProps {
  /** 卡片标题 */
  title?: string
  /** 卡片副标题 */
  subtitle?: string
  /** 徽章文本 */
  badgeText?: string
  /** 徽章颜色 */
  badgeColor?: string
  /** 右侧图标 */
  rightIcon?: keyof typeof Ionicons.glyphMap
  /** 左侧图标 */
  leftIcon?: keyof typeof Ionicons.glyphMap
  /** 图标大小 */
  iconSize?: number
  /** 是否可点击 */
  touchable?: boolean
  /** 点击事件 */
  onPress?: () => void
  /** 卡片内容 */
  children?: ReactNode
  /** 自定义卡片样式 */
  style?: ViewStyle
  /** 自定义标题样式 */
  titleStyle?: TextStyle
  /** 自定义副标题样式 */
  subtitleStyle?: TextStyle
  /** 自定义徽章样式 */
  badgeStyle?: ViewStyle
  /** 自定义徽章文本样式 */
  badgeTextStyle?: TextStyle
  /** 是否显示阴影 */
  showShadow?: boolean
  /** 边框圆角 */
  borderRadius?: number
  /** 内边距 */
  padding?: number
}

/**
 * 通用卡片基础组件
 *
 * 提供统一的卡片样式和结构，支持：
 * - 标题和副标题
 * - 徽章显示
 * - 左右图标
 * - 可点击交互
 * - 自定义样式
 * - 阴影效果
 *
 * @example
 * ```tsx
 * <BaseCard
 *   title="房间名称"
 *   subtitle="2/4 人"
 *   badgeText="进行中"
 *   badgeColor="#4CAF50"
 *   rightIcon="chevron-forward"
 *   touchable={true}
 *   onPress={() => console.log('card pressed')}
 * >
 *   <Text>卡片内容</Text>
 * </BaseCard>
 * ```
 */
export const BaseCard: React.FC<BaseCardProps> = ({
  title,
  subtitle,
  badgeText,
  badgeColor = '#007AFF',
  rightIcon,
  leftIcon,
  iconSize = 20,
  touchable = false,
  onPress,
  children,
  style,
  titleStyle,
  subtitleStyle,
  badgeStyle,
  badgeTextStyle,
  showShadow = true,
  borderRadius = 12,
  padding = 16,
}) => {
  const colorScheme = useColorScheme() ?? 'light'

  const cardContent = (
    <View
      style={[
        styles.card,
        styles[`card_${colorScheme}`],
        showShadow && styles.shadow,
        { borderRadius, padding },
        style,
      ]}
    >
      {/* 头部区域 */}
      {(title || subtitle || badgeText || leftIcon || rightIcon) && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {leftIcon && (
              <Ionicons
                name={leftIcon}
                size={iconSize}
                color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                style={styles.leftIcon}
              />
            )}
            <View style={styles.titleContainer}>
              {title && (
                <Text style={[styles.title, styles[`title_${colorScheme}`], titleStyle]}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={[styles.subtitle, styles[`subtitle_${colorScheme}`], subtitleStyle]}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.headerRight}>
            {badgeText && (
              <View style={[styles.badge, { backgroundColor: badgeColor }, badgeStyle]}>
                <Text style={[styles.badgeText, badgeTextStyle]}>{badgeText}</Text>
              </View>
            )}
            {rightIcon && (
              <Ionicons
                name={rightIcon}
                size={iconSize}
                color={colorScheme === 'dark' ? '#8E8E93' : '#8E8E93'}
                style={styles.rightIcon}
              />
            )}
          </View>
        </View>
      )}

      {/* 内容区域 */}
      {children && <View style={styles.content}>{children}</View>}
    </View>
  )

  if (touchable && onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {cardContent}
      </TouchableOpacity>
    )
  }

  return cardContent
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginVertical: 4,
  },
  card_light: {
    backgroundColor: '#FFFFFF',
  },
  card_dark: {
    backgroundColor: '#2C2C2E',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  title_light: {
    color: '#000000',
  },
  title_dark: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
  },
  subtitle_light: {
    color: '#8E8E93',
  },
  subtitle_dark: {
    color: '#8E8E93',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  content: {
    marginTop: 8,
  },
})

export default BaseCard
