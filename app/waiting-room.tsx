import React, { useEffect } from 'react'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { RoomWaiting } from '@/components/RoomWaiting'
import { useTranslation } from 'react-i18next'
import { OnlinePlayer } from '@/types/online'
import { useSocket } from '@/hooks/use-socket'
import { useRoomStore } from '@/store/roomStore'

export default function WaitingRoomPage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()

  const socket = useSocket()
  const { currentRoom, setCurrentRoom } = useRoomStore()

  // 获取传入的参数
  const roomId = params.roomId as string

  // 监听游戏状态变化，自动跳转到游戏页面
  useEffect(() => {
    if (currentRoom?.gameStatus === 'playing') {
      console.log('🎮 游戏开始，跳转到游戏页面')
      router.replace({
        pathname: '/flying-chess',
        params: {
          roomId: currentRoom?.id,
          onlineMode: 'true',
        },
      })
    }
  }, [currentRoom?.gameStatus])

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
        onStartGame={() => {
          socket.startGame({ roomId: currentRoom?.id })
        }}
        onLeaveRoom={() => {
          socket.leaveRoom()
          setCurrentRoom(null)
          router.back()
        }}
      />
    </>
  )
}
