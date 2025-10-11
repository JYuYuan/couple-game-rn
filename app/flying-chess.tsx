import React, { useEffect, useRef } from 'react'
import { useLocalSearchParams } from 'expo-router'
import OnlineGame from '@/components/game/flying/online'
import OfflineGame from '@/components/game/flying/offline'
import { useSocket } from '@/hooks/use-socket'
import LoadingScreen from '@/components/LoadingScreen'

export default function FlyingChessGame() {
  const params = useLocalSearchParams()
  const isOnlineMode = params.onlineMode === 'true'
  const hasCheckedConnection = useRef(false)

  const socket = useSocket()

  // 在线模式下，页面加载时检查并确保socket连接正常
  useEffect(() => {
    if (isOnlineMode && !hasCheckedConnection.current) {
      hasCheckedConnection.current = true
      
      // 延迟检查连接状态，给socket一些时间初始化
      const checkTimer = setTimeout(() => {
        if (!socket.isConnected) {
          console.log('FlyingChess: Socket未连接，尝试强制重连')
          socket.forceReconnect()
        }
      }, 1000)

      return () => clearTimeout(checkTimer)
    }
  }, [isOnlineMode, socket.isConnected, socket.forceReconnect])

  // 在线模式下的连接状态检查
  if (isOnlineMode) {
    // 如果有连接错误，也显示加载状态（因为可能正在重连）
    if (!socket.isConnected || socket.connectionError) {
      return <LoadingScreen />
    }
  }

  return isOnlineMode ? <OnlineGame /> : <OfflineGame />
}
