import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { socketService } from '@/services/socket-service'
import { webrtcService } from '@/services/webrtc-service'
import {
  ConnectionType,
  CreateLANRoomData,
  CreateRoomData,
  DiceRollResult,
  JoinLANRoomData,
  JoinRoomData,
  LANRoom,
  OnlineRoom,
  WebRTCConnectionState,
} from '@/types/online'
import { useSettingsStore } from '@/store'
import { useRoomStore } from '@/store/roomStore'

interface SocketContextValue {
  // 连接状态
  isConnected: boolean
  connectionError: string | null
  currentRoom: OnlineRoom | LANRoom | null

  // 连接类型和状态
  connectionType: ConnectionType
  currentLANRoom: LANRoom | null
  webrtcConnections: Map<string, WebRTCConnectionState>

  // 连接管理
  connect: () => void
  disconnect: () => void
  forceReconnect: () => void

  // 在线房间管理
  createRoom: (data: CreateRoomData) => void
  joinRoom: (data: JoinRoomData) => void

  // 局域网房间管理
  createLANRoom: (data: CreateLANRoomData) => Promise<LANRoom>
  joinLANRoom: (data: JoinLANRoomData) => Promise<LANRoom>
  switchToOnlineMode: () => void
  switchToLANMode: () => void

  // 房间发现
  getDiscoveredRooms: (() => LANRoom[]) | undefined
  startRoomScan: (() => void) | undefined
  stopRoomScan: (() => void) | undefined

  // 通用房间操作
  leaveRoom: () => void
  resetRoomState: () => void

  // 游戏事件
  startGame: (data: any) => void
  rollDice: (data: any, callback?: (result: DiceRollResult) => void) => void
  completeTask: (data: any) => void

  // 事件管理
  runActions: (event: string, data: any) => void
  emit: (event: string, data?: any) => void
  on: (event: string, callback: Function) => void
  off: (event: string, callback: Function) => void

  // 实用函数
  isHost: boolean
  currentPlayer: any
}

const SocketContext = createContext<SocketContextValue | null>(null)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { playerId } = useSettingsStore()
  const [isConnected, setIsConnected] = useState(socketService.getIsConnected())
  const [connectionError, setConnectionError] = useState(socketService.getConnectionError())
  const { currentRoom, setCurrentRoom } = useRoomStore()

  // 局域网相关状态
  const [connectionType, setConnectionType] = useState<ConnectionType>('online')
  const [currentLANRoom, setCurrentLANRoom] = useState(webrtcService?.getCurrentRoom())
  const [webrtcConnections, setWebrtcConnections] = useState<Map<string, WebRTCConnectionState>>(
    new Map(),
  )

  // 监听 SocketService 的状态变化 - 只注册一次
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true)
      setConnectionError(null)
    }

    const handleDisconnect = () => {
      console.log('SocketProvider: Received disconnect event')
      setIsConnected(false)
    }

    const handleConnectError = () => {
      console.log('SocketProvider: Received connect_error event')
      setIsConnected(false)
      setConnectionError(socketService.getConnectionError())
    }

    const handleCurrentRoomChanged = (room: OnlineRoom | null) => {
      console.log('SocketProvider: Room changed', room)
      if (!room) return setCurrentRoom(null)
      room.isHost = room.hostId === playerId
      setCurrentRoom(room)
    }

    const handleError = () => {
      console.log('SocketProvider: Received error event')
      setConnectionError(socketService.getConnectionError())
    }

    const handleReconnect = (attemptNumber: number) => {
      console.log('SocketProvider: Successfully reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)
      setConnectionError(null)
    }

    const handlePlayerReconnected = (data: { playerId: string; playerName: string }) => {
      console.log('SocketProvider: Player reconnected:', data.playerName)
    }

    // 注册事件监听器
    socketService.on('connect', handleConnect)
    socketService.on('disconnect', handleDisconnect)
    socketService.on('connect_error', handleConnectError)
    socketService.on('currentRoomChanged', handleCurrentRoomChanged)
    socketService.on('error', handleError)
    socketService.on('reconnect', handleReconnect)
    socketService.on('player:reconnected', handlePlayerReconnected)

    return () => {
      // 清理事件监听器
      socketService.off('connect', handleConnect)
      socketService.off('disconnect', handleDisconnect)
      socketService.off('connect_error', handleConnectError)
      socketService.off('currentRoomChanged', handleCurrentRoomChanged)
      socketService.off('error', handleError)
      socketService.off('reconnect', handleReconnect)
      socketService.off('player:reconnected', handlePlayerReconnected)
    }
  }, [playerId, setCurrentRoom])

  // 监听 WebRTC 服务的状态变化
  useEffect(() => {
    const handleRoomCreated = (room: LANRoom) => {
      console.log('SocketProvider: WebRTC room created:', room.id)
      setCurrentLANRoom(room)
      setConnectionType('lan')
    }

    const handleRoomUpdated = (room: LANRoom) => {
      console.log('SocketProvider: WebRTC room updated:', room.id)
      setCurrentLANRoom(room)
    }

    const handleRoomJoined = (room: LANRoom) => {
      console.log('SocketProvider: Joined WebRTC room:', room.id)
      setCurrentLANRoom(room)
      setConnectionType('lan')
    }

    const handleRoomLeft = () => {
      console.log('SocketProvider: Left WebRTC room')
      setCurrentLANRoom(null)
      setConnectionType('online')
      setWebrtcConnections(new Map())
    }

    const handleConnectionStateChanged = (peerId: string, state: WebRTCConnectionState) => {
      console.log('SocketProvider: WebRTC connection state changed:', peerId, state)
      setWebrtcConnections((prev) => {
        const newMap = new Map(prev)
        newMap.set(peerId, state)
        return newMap
      })
    }

    const handlePlayerJoined = (player: any) => {
      console.log('SocketProvider: Player joined WebRTC room:', player.name)
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
    if (!socketService.getIsConnected()) socketService.connect(playerId)
  }, [playerId])

  const disconnect = useCallback(() => {
    socketService.disconnect()
  }, [])

  const forceReconnect = useCallback(() => {
    socketService.forceReconnect()
  }, [])

  const createRoom = useCallback((data: CreateRoomData) => {
    socketService.createRoom(data)
  }, [])

  const joinRoom = useCallback((data: JoinRoomData) => {
    socketService.joinRoom(data)
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
      console.log('🎮 startGame called with data:', data)

      if (connectionType === 'lan') {
        webrtcService?.startGame(data)
        return
      }

      socketService.startGame(data)
    },
    [connectionType],
  )

  const rollDice = useCallback(
    (data: any, callback: any) => {
      if (connectionType === 'lan') {
        webrtcService?.rollDice(data, callback)
      } else {
        socketService.rollDice(data, callback)
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
        console.warn('Custom on not supported in LAN mode:', event)
      } else {
        socketService.on(event, callback)
      }
    },
    [connectionType],
  )

  const off = useCallback(
    (event: string, callback: Function) => {
      if (connectionType === 'lan') {
        console.warn('Custom off not supported in LAN mode:', event)
      } else {
        socketService.off(event, callback)
      }
    },
    [connectionType],
  )

  const runActions = useCallback(
    (event: string, data: any, callback?: (res: any) => void) => {
      if (connectionType === 'lan') {
        console.warn('Custom runActions not supported in LAN mode:', event)
      } else {
        socketService.runActions(event, data, callback)
      }
    },
    [connectionType],
  )

  // 初始连接逻辑 - 只在首次加载时连接一次
  useEffect(() => {
    const socket = socketService.getSocket()

    if (!socket || !socket.connected) {
      console.log(
        'SocketProvider: 初始连接, playerId:',
        playerId,
        'socket exists:',
        !!socket,
        'connected:',
        socket?.connected,
      )
      connect()
    } else {
      console.log('SocketProvider: 跳过连接，socket已连接:', socket.id)
    }
  }, [playerId, connect])

  const value: SocketContextValue = {
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
    forceReconnect,

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
    completeTask,

    // 事件管理
    runActions,
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

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

// 自定义 Hook 用于访问 Socket Context
export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    // 当 SocketProvider 不可用时，返回一个空的默认实现而不是抛出错误
    console.warn('useSocket: SocketProvider is not available. Returning mock implementation.')
    return {
      isConnected: false,
      connectionError: null,
      currentRoom: null,
      connectionType: 'online' as ConnectionType,
      currentLANRoom: null,
      webrtcConnections: new Map(),
      connect: () => {},
      disconnect: () => {},
      forceReconnect: () => {},
      createRoom: () => {},
      joinRoom: () => {},
      createLANRoom: async () => ({} as LANRoom),
      joinLANRoom: async () => ({} as LANRoom),
      switchToOnlineMode: () => {},
      switchToLANMode: () => {},
      getDiscoveredRooms: undefined,
      startRoomScan: undefined,
      stopRoomScan: undefined,
      leaveRoom: () => {},
      resetRoomState: () => {},
      startGame: () => {},
      rollDice: () => {},
      completeTask: () => {},
      runActions: () => {},
      emit: () => {},
      on: () => {},
      off: () => {},
      isHost: false,
      currentPlayer: null,
    }
  }
  return context
}
