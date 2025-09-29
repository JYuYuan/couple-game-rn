import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import OnlineGame from '@/components/game/flying/online'
import OfflineGame from '@/components/game/flying/offline'
import { useSocket } from '@/hooks/use-socket'
import LoadingScreen from '@/components/LoadingScreen'

export default function FlyingChessGame() {
  const params = useLocalSearchParams()
  const isOnlineMode = params.onlineMode === 'true'

  const socket = useSocket()

  // 在线模式下的连接状态检查
  if (isOnlineMode) {
    // 如果有连接错误，也显示加载状态（因为可能正在重连）
    if (!socket.isConnected || socket.connectionError) {
      return <LoadingScreen />
    }
  }

  return isOnlineMode ? <OnlineGame /> : <OfflineGame />
}
