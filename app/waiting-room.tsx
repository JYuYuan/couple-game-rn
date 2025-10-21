import React, { useEffect, useState } from 'react'
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { RoomWaiting } from '@/components/RoomWaiting'
import { useTranslation } from 'react-i18next'
import { OnlinePlayer } from '@/types/online'
import { useSocket } from '@/hooks/use-socket'
import { useRoomStore } from '@/store/roomStore'
import { showError, showSuccess } from '@/utils/toast'

export default function WaitingRoomPage() {
  const router = useRouter()
  const navigation = useNavigation()
  const params = useLocalSearchParams()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()

  const socket = useSocket()
  const { currentRoom, clearRoom } = useRoomStore()
  const [isStartingGame, setIsStartingGame] = useState(false)

  // 获取传入的参数
  const roomId = params.roomId as string

  // 监听返回按钮点击事件
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // 如果正在离开页面，清除房间状态
      console.log('🚪 等待室检测到返回操作，清除房间状态')

      // 清除房间状态
      clearRoom()

      // 离开房间
      if (currentRoom?.id) {
        socket.leaveRoom()
      }
    })

    return unsubscribe
  }, [navigation, currentRoom?.id])

  // 监听游戏状态变化，自动跳转到游戏页面
  useEffect(() => {
    if (currentRoom?.gameStatus === 'playing') {
      console.log('🎮 游戏开始，跳转到游戏页面')
      setIsStartingGame(false) // 重置开始游戏状态
      router.replace({
        pathname: '/flying-chess',
        params: {
          roomId: currentRoom?.id,
          onlineMode: 'true',
        },
      })
    }
  }, [currentRoom?.gameStatus])

  // 处理开始游戏
  const handleStartGame = async () => {
    if (isStartingGame) {
      console.log('⚠️ 游戏正在开始中，请勿重复点击')
      return
    }

    if (!socket.isConnected) {
      showError('连接错误', '网络连接不稳定，请稍后重试')
      return
    }

    if (!currentRoom?.id) {
      showError('房间错误', '房间信息异常，请重新加入')
      return
    }

    try {
      setIsStartingGame(true)
      console.log('🎮 开始游戏，房间ID:', currentRoom.id)

      await socket.startGame({ roomId: currentRoom.id })

      // 显示成功提示
      showSuccess('游戏开始', '正在启动游戏...')

      // 如果3秒后还没有跳转，重置状态
      setTimeout(() => {
        if (currentRoom?.gameStatus !== 'playing') {
          setIsStartingGame(false)
          console.warn('⚠️ 游戏开始超时，重置状态')
        }
      }, 3000)
    } catch (error) {
      console.error('❌ 开始游戏失败:', error)
      setIsStartingGame(false)
      showError('开始游戏失败', '请检查网络连接后重试')
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${t('online.waitingRoom', '等待房间')} - ${currentRoom?.name}`,
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.homeBackground,
          },
          headerTintColor: colors.homeTitle,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerBackTitle: t('common.back', '返回'),
        }}
      />

      <RoomWaiting
        isHost={currentRoom?.isHost}
        maxPlayers={currentRoom?.maxPlayers || 2}
        roomId={currentRoom?.id || roomId || 'UNKNOWN'}
        players={currentRoom?.players as OnlinePlayer[]}
        onStartGame={handleStartGame}
        onLeaveRoom={() => {
          socket.leaveRoom()
          router.back()
        }}
        isStartingGame={isStartingGame}
        isConnected={socket.isConnected}
      />
    </>
  )
}
