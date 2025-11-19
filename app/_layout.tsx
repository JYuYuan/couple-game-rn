import { Stack } from 'expo-router'
import 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import '../global.css'
import { useCallback, useEffect, useState } from 'react'
import { useAudioManager } from '@/hooks/use-audio-manager'
import { useSettingsStore } from '@/store'
import { useRoomStore } from '@/store/roomStore'
import * as SplashScreen from 'expo-splash-screen'
import '@/i18n'
import { AppState, Platform } from 'react-native'
import { ConfirmDialogProvider } from '@/components/ConfirmDialog'
import { ToastProvider } from '@/components/Toast'
import { SocketProvider } from '@/contexts/SocketContext'
import { getLANService, isLANAvailable } from '@/sockets/lan'
import { AIConfigInitializer } from '@/components/AIConfigInitializer'

// 防止启动屏自动隐藏
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const audioManager = useAudioManager()
  const { soundSettings, networkSettings } = useSettingsStore()
  const { clearRoom } = useRoomStore()
  const [appIsReady, setAppIsReady] = useState(false)

  // 自动播放背景音乐
  useEffect(() => {
    const handleAudioControl = async () => {
      // 确保应用已经准备好
      if (!appIsReady) return

      // 延迟一点时间确保音频已经初始化完成
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (soundSettings.bgmEnabled && !soundSettings.globalMute) {
        console.log('Attempting to play background music...')
        await audioManager.play()
      } else {
        console.log('Attempting to pause background music...')
        await audioManager.pause()
      }
    }

    handleAudioControl().catch(console.error)
  }, [soundSettings.bgmEnabled, soundSettings.globalMute, appIsReady, audioManager])

  // 控制启动屏显示时间
  useEffect(() => {
    async function prepare() {
      try {
        // 清理过期的房间状态（应用重启/热更新后房间可能已失效）
        console.log('🧹 应用启动，清理过期的房间状态')
        clearRoom()

        // 如果有 LAN 服务在运行，也清理掉
        if (networkSettings.lanMode && isLANAvailable()) {
          try {
            const lanService = getLANService()
            await lanService.cleanup()
          } catch (error) {
            console.warn('清理 LAN 服务失败:', error)
          }
        }

        // 这里可以进行一些初始化操作，比如加载资源、检查更新等
        // 延长启动屏显示时间（3秒）
        await new Promise((resolve) => setTimeout(resolve, 3000))
      } catch (e) {
        console.warn(e)
      } finally {
        // 标记应用准备就绪
        setAppIsReady(true)
      }
    }

    if (Platform.OS !== 'web' && typeof window !== 'undefined') {
      prepare()
    } else {
      // Web 平台也需要清理房间状态
      clearRoom()
      setAppIsReady(true)
    }
  }, [])

  // 监听 App 状态变化，清理 LAN 资源
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      console.log('AppState changed to:', nextAppState)

      // 当 app 进入后台或不活跃状态时，清理 LAN 资源
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (networkSettings.lanMode && isLANAvailable()) {
          try {
            const lanService = getLANService()
            console.log('App 进入后台，清理 LAN 服务...')
            await lanService.cleanup()
          } catch (error) {
            console.warn('清理 LAN 服务失败:', error)
          }
        }
      }
    })

    return () => {
      subscription.remove()
    }
  }, [networkSettings.lanMode])

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // 应用准备好后，隐藏启动屏
      await SplashScreen.hideAsync()
    }
  }, [appIsReady])

  if (!appIsReady) {
    return null
  }

  // 检查是否启用了网络模式或局域网模式
  const isNetworkEnabled = networkSettings.enabled || networkSettings.lanMode

  // 根据网络设置条件包裹内容
  const content = (
    <ToastProvider>
      <ConfirmDialogProvider />
      <AIConfigInitializer />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '主页' }} />
      </Stack>
    </ToastProvider>
  )

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {isNetworkEnabled ? <SocketProvider>{content}</SocketProvider> : content}
    </GestureHandlerRootView>
  )
}
