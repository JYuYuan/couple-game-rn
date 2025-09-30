import React from 'react'
import { View, ScrollView, StyleSheet, ViewStyle, ScrollViewProps } from 'react-native'
import { CommonStyles, Layout } from '@/constants/theme'

interface ContainerProps {
  children: React.ReactNode
  style?: ViewStyle
  scrollable?: boolean
  centerContent?: boolean
  maxWidth?: number
  padding?: keyof typeof Layout.padding
}

interface ScrollableContainerProps extends ContainerProps, ScrollViewProps {
  scrollable: true
}

interface NonScrollableContainerProps extends ContainerProps {
  scrollable?: false
}

type CombinedContainerProps = ScrollableContainerProps | NonScrollableContainerProps

/**
 * 通用容器组件，自动应用最大宽度限制和居中布局
 * 适用于Web端大屏幕显示
 */
export function Container({
  children,
  style,
  scrollable = false,
  centerContent = false,
  maxWidth = Layout.maxWidth,
  padding = 'md',
  ...props
}: CombinedContainerProps) {
  const containerStyle = [
    CommonStyles.container,
    style,
  ]

  const contentStyle = [
    CommonStyles.content,
    { maxWidth },
  ]

  const innerContentStyle = [
    centerContent ? CommonStyles.centeredContainer : CommonStyles.contentContainer,
    {
      padding: Layout.padding[padding],
      maxWidth,
    },
  ]

  if (scrollable) {
    const scrollProps = props as ScrollViewProps
    return (
      <View style={containerStyle}>
        <ScrollView
          style={contentStyle}
          contentContainerStyle={innerContentStyle}
          showsVerticalScrollIndicator={false}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={containerStyle}>
      <View style={contentStyle}>
        <View style={innerContentStyle}>
          {children}
        </View>
      </View>
    </View>
  )
}

/**
 * 响应式卡片容器
 */
export function CardContainer({
  children,
  style,
  maxWidth = Layout.contentMaxWidth,
}: {
  children: React.ReactNode
  style?: ViewStyle
  maxWidth?: number
}) {
  return (
    <View style={[
      CommonStyles.cardContainer,
      { maxWidth, alignSelf: 'center', width: '100%' },
      style,
    ]}>
      {children}
    </View>
  )
}

/**
 * 响应式网格容器
 */
export function GridContainer({
  children,
  style,
  columns = 2,
  maxWidth = Layout.maxWidth,
}: {
  children: React.ReactNode
  style?: ViewStyle
  columns?: number
  maxWidth?: number
}) {
  return (
    <View style={[
      CommonStyles.responsiveGrid,
      { maxWidth, alignSelf: 'center', width: '100%' },
      style,
    ]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  // 这里可以添加额外的样式
})