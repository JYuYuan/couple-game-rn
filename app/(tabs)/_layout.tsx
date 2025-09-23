import React, { useEffect } from 'react'
import { Dimensions, Platform, Pressable, StyleSheet, View } from 'react-native'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'

const { width: screenWidth } = Dimensions.get('window')

const ICONS = ['home', 'list-outline', 'settings-sharp'] // 支持3个标签页

const CustomTabBar: React.FC<any> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any

  const tabCount = state.routes.length
  const tabBarPadding = 20
  const tabWidth = (screenWidth - tabBarPadding * 2) / tabCount
  const indicatorWidth = tabWidth - 40 // 指示器比tab小一些

  const translateX = useSharedValue(state.index * tabWidth)

  useEffect(() => {
    translateX.value = withSpring(state.index * tabWidth, {
      damping: 22,
      stiffness: 200,
      mass: 1,
    })
  }, [state.index, tabWidth])

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <BlurView
        intensity={80}
        tint={colors.tabBarTint}
        style={[
          styles.blur,
          {
            backgroundColor: colors.tabBarBackground,
            borderWidth: 1,
            borderColor: colors.tabBarBorder,
          },
        ]}
      >
        <View style={styles.tabContent}>
          <Animated.View
            style={[styles.indicator, indicatorStyle, { width: indicatorWidth, left: 20 }]}
          >
            <BlurView intensity={80} tint={colors.tabBarTint} style={styles.glassIndicator}>
              <View
                style={[
                  styles.glassBackground,
                  {
                    backgroundColor: colors.tabBarIndicatorBackground,
                    borderColor: colors.tabBarIndicatorBorder,
                  },
                ]}
              />
            </BlurView>
          </Animated.View>

          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name)
            }
            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key })
            return (
              <TabButton
                key={route.key}
                icon={ICONS[index]}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                activeColor={colors.tabBarIconActive}
                inactiveColor={colors.tabBarIconInactive}
              />
            )
          })}
        </View>
      </BlurView>
    </View>
  )
}

const TabButton: React.FC<any> = ({
  icon,
  isFocused,
  onPress,
  onLongPress,
  activeColor,
  inactiveColor,
}) => {
  const scale = useSharedValue(isFocused ? 1.15 : 1)

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.15 : 1, {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    })
  }, [isFocused, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  // 使用动态颜色
  const iconColor = isFocused ? activeColor : inactiveColor

  return (
    <Animated.View style={[styles.tabButton, animatedStyle]}>
      <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.pressable}>
        <Ionicons name={icon} size={26} color={iconColor} />
      </Pressable>
    </Animated.View>
  )
}

export default function TabLayout() {
  const { t } = useTranslation()

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home', '首页') }} />
      <Tabs.Screen name="tasks" options={{ title: t('tabs.tasks', '任务') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings', '设置') }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 20,
  },
  blur: {
    borderRadius: 25,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  tabContent: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  glassIndicator: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  glassBackground: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 0.5,
  },
  tabButton: {
    flex: 1,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
