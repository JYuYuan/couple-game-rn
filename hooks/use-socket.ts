import { useCallback, useEffect, useMemo, useState } from 'react'
import { socketService } from '@/services/socket-service'
import { webrtcService } from '@/services/webrtc-service'
import {
  CreateRoomData,
  JoinRoomData,
  OnlineRoom,
  LANRoom,
  CreateLANRoomData,
  JoinLANRoomData,
  ConnectionType,
  WebRTCConnectionState,
} from '@/types/online'
import { useSettingsStore } from '@/store'

export const useSocket = () => {
  const { playerId } = useSettingsStore()
  const [isConnected, setIsConnected] = useState(socketService.getIsConnected())
  const [connectionError, setConnectionError] = useState(socketService.getConnectionError())
  const [currentRoom, setCurrentRoom] = useState(socketService.getCurrentRoom())

  // 局域网相关状态
  const [connectionType, setConnectionType] = useState<ConnectionType>('online')
  const [currentLANRoom, setCurrentLANRoom] = useState(webrtcService?.getCurrentRoom())
  const [webrtcConnections, setWebrtcConnections] = useState<Map<string, WebRTCConnectionState>>(
    new Map(),
  )

  // 监听 SocketService 的状态变化
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true)
      setConnectionError(null)
    }

    const handleDisconnect = () => {
      console.log('useSocket: Received disconnect event')
      setIsConnected(false)
    }

    const handleConnectError = () => {
      console.log('useSocket: Received connect_error event')
      setIsConnected(false)
      setConnectionError(socketService.getConnectionError())
    }

    const handleCurrentRoomChanged = (room: OnlineRoom | null) => {
      console.log('useSocket: Received currentRoomChanged event:', room?.id)
      setCurrentRoom(room)
    }

    const handleError = () => {
      console.log('useSocket: Received error event')
      setConnectionError(socketService.getConnectionError())
    }

    // 注册事件监听器
    socketService.on('connect', handleConnect)
    socketService.on('disconnect', handleDisconnect)
    socketService.on('connect_error', handleConnectError)
    socketService.on('currentRoomChanged', handleCurrentRoomChanged)
    socketService.on('error', handleError)

    return () => {
      // 清理事件监听器
      socketService.off('connect', handleConnect)
      socketService.off('disconnect', handleDisconnect)
      socketService.off('connect_error', handleConnectError)
      socketService.off('currentRoomChanged', handleCurrentRoomChanged)
      socketService.off('error', handleError)
    }
  }, [])

  // 监听 WebRTC 服务的状态变化
  useEffect(() => {
    const handleRoomCreated = (room: LANRoom) => {
      console.log('useSocket: WebRTC room created:', room.id)
      setCurrentLANRoom(room)
      setConnectionType('lan')
    }

    const handleRoomUpdated = (room: LANRoom) => {
      console.log('useSocket: WebRTC room updated:', room.id)
      setCurrentLANRoom(room)
    }

    const handleRoomJoined = (room: LANRoom) => {
      console.log('useSocket: Joined WebRTC room:', room.id)
      setCurrentLANRoom(room)
      setConnectionType('lan')
    }

    const handleRoomLeft = () => {
      console.log('useSocket: Left WebRTC room')
      setCurrentLANRoom(null)
      setConnectionType('online')
      setWebrtcConnections(new Map())
    }

    const handleConnectionStateChanged = (peerId: string, state: WebRTCConnectionState) => {
      console.log('useSocket: WebRTC connection state changed:', peerId, state)
      setWebrtcConnections((prev) => {
        const newMap = new Map(prev)
        newMap.set(peerId, state)
        return newMap
      })
    }

    const handlePlayerJoined = (player: any) => {
      console.log('useSocket: Player joined WebRTC room:', player.name)
    }

    // 注册 WebRTC 事件监听器
    webrtcService?.on('roomCreated', handleRoomCreated)
    webrtcService?.on('roomUpdated', handleRoomUpdated)
    webrtcService?.on('roomJoined', handleRoomJoined)
    webrtcService?.on('roomLeft', handleRoomLeft)
    webrtcService?.on('connectionStateChanged', handleConnectionStateChanged)
    webrtcService?.on('playerJoined', handlePlayerJoined)

    return () => {
      // 清理 WebRTC 事件监听器
      webrtcService?.off('roomCreated', handleRoomCreated)
      webrtcService?.off('roomUpdated', handleRoomUpdated)
      webrtcService?.off('roomJoined', handleRoomJoined)
      webrtcService?.off('roomLeft', handleRoomLeft)
      webrtcService?.off('connectionStateChanged', handleConnectionStateChanged)
      webrtcService?.off('playerJoined', handlePlayerJoined)
    }
  }, [])

  // 包装的方法
  const connect = useCallback(() => {
    socketService.connect(playerId)
  }, [])

  const disconnect = useCallback(() => {
    socketService.disconnect()
  }, [])

  const createRoom = useCallback((data: CreateRoomData): Promise<OnlineRoom> => {
    return socketService.createRoom(data)
  }, [])

  const joinRoom = useCallback((data: JoinRoomData): Promise<OnlineRoom> => {
    return socketService.joinRoom(data)
  }, [])

  const currentUser = useCallback(() => {
    return socketService.getCurrentPlayer()
  }, [])

  const leaveRoom = useCallback(() => {
    if (connectionType === 'lan') {
      webrtcService?.leaveRoom()
    } else {
      socketService.leaveRoom()
    }
  }, [connectionType])

  const resetRoomState = useCallback(() => {
    if (connectionType === 'lan') {
      webrtcService?.leaveRoom()
    } else {
      socketService.resetRoomState()
    }
  }, [connectionType])

  // 局域网房间操作
  const createLANRoom = useCallback((data: CreateLANRoomData): Promise<LANRoom> => {
    return webrtcService?.createLANRoom(data)
  }, [])

  const joinLANRoom = useCallback((data: JoinLANRoomData): Promise<LANRoom> => {
    return webrtcService?.joinLANRoom(data)
  }, [])

  const switchToOnlineMode = useCallback(() => {
    if (connectionType === 'lan') {
      webrtcService?.leaveRoom()
    }
    setConnectionType('online')
  }, [connectionType])

  const switchToLANMode = useCallback(() => {
    if (connectionType === 'online' && currentRoom) {
      socketService.leaveRoom()
    }
    setConnectionType('lan')
  }, [connectionType, currentRoom])

  // 游戏事件
  const startGame = useCallback(
    (data: any) => {
      if (connectionType === 'lan') {
        webrtcService?.startGame(data)
      } else {
        socketService.startGame(data)
      }
    },
    [connectionType],
  )

  const rollDice = useCallback(
    (data: any) => {
      if (connectionType === 'lan') {
        webrtcService?.rollDice(data)
      } else {
        socketService.rollDice(data)
      }
    },
    [connectionType],
  )

  const movePlayer = useCallback(
    (data: any) => {
      if (connectionType === 'lan') {
        webrtcService?.movePlayer(data)
      } else {
        socketService.movePlayer(data)
      }
    },
    [connectionType],
  )

  const triggerTask = useCallback(
    (data: any) => {
      if (connectionType === 'lan') {
        webrtcService?.triggerTask(data)
      } else {
        socketService.triggerTask(data)
      }
    },
    [connectionType],
  )

  const completeTask = useCallback(
    (data: any) => {
      if (connectionType === 'lan') {
        webrtcService?.completeTask(data)
      } else {
        socketService.completeTask(data)
      }
    },
    [connectionType],
  )

  const emit = useCallback(
    (event: string, data?: any) => {
      if (connectionType === 'lan') {
        // LANmode 暂时不支持自定义事件发送
        console.warn('Custom emit not supported in LAN mode:', event)
      } else {
        socketService.socketEmit(event, data)
      }
    },
    [connectionType],
  )

  const on = useCallback(
    (event: string, callback: Function) => {
      if (connectionType === 'lan') {
        // LANmode 暂时不支持自定义事件发送
        console.warn('Custom emit not supported in LAN mode:', event)
      } else {
        socketService.on(event, callback)
      }
    },
    [connectionType],
  )

  const off = useCallback(
    (event: string, callback: Function) => {
      if (connectionType === 'lan') {
        // LANmode 暂时不支持自定义事件发送
        console.warn('Custom emit not supported in LAN mode:', event)
      } else {
        socketService.off(event, callback)
      }
    },
    [connectionType],
  )

  return {
    // 连接状态
    isConnected: connectionType === 'lan' ? currentLANRoom !== null : isConnected,
    connectionError,
    currentRoom: connectionType === 'lan' ? currentLANRoom : currentRoom,

    // 连接类型和状态
    connectionType,
    currentLANRoom,
    webrtcConnections,

    // 连接管理
    connect,
    disconnect,

    // 在线房间管理
    createRoom,
    joinRoom,

    // 局域网房间管理
    createLANRoom,
    joinLANRoom,
    switchToOnlineMode,
    switchToLANMode,

    // 房间发现
    getDiscoveredRooms: webrtcService?.getDiscoveredRooms,
    startRoomScan: webrtcService?.startRoomScan,
    stopRoomScan: webrtcService?.stopRoomScan,

    // 通用房间操作
    leaveRoom,
    resetRoomState,

    // 游戏事件
    startGame,
    rollDice,
    movePlayer,
    triggerTask,
    completeTask,

    // 事件管理
    emit,
    on,
    off,

    // 实用函数
    isHost: connectionType === 'lan' ? webrtcService?.isHost() : socketService.isHost(playerId),
    currentPlayer:
      connectionType === 'lan'
        ? currentLANRoom?.players.find((p: any) => p.id === webrtcService?.getMyPeerId())
        : currentUser,
  }
}
