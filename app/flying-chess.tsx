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
        // 局域网模式下不需要检查 socket 连接
        if (socket.connectionType === 'lan') {
          console.log('FlyingChess: 局域网模式，跳过 Socket 连接检查')
          return
        }

        // 在线模式下才检查 socket 连接
        if (!socket.isConnected) {
          console.log('FlyingChess: Socket未连接，尝试强制重连')
          socket.forceReconnect()
        }
      }, 1000)

      return () => clearTimeout(checkTimer)
    }
  }, [isOnlineMode, socket.isConnected, socket.forceReconnect, socket.connectionType])

  // 在线模式下的连接状态检查
  if (isOnlineMode) {
    // 局域网模式下，不需要检查 socket 连接状态
    if (socket.connectionType === 'lan') {
      // 局域网模式直接渲染游戏
      return <OnlineGame />
    }
  }

  return isOnlineMode ? <OnlineGame /> : <OfflineGame />
}
