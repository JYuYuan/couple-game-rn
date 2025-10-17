import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { socketService } from '@/services/socket-service'
import { lanServerManager } from '@/services/lan-server-manager'
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

  // 连接类型状态
  const [connectionType, setConnectionType] = useState<ConnectionType>('online')
  const [webrtcConnections] = useState<Map<string, WebRTCConnectionState>>(new Map())

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

    const handleCurrentRoomChanged = (room: OnlineRoom | LANRoom | null) => {
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
    socketService.leaveRoom()
  }, [])

  const resetRoomState = useCallback(() => {
    socketService.resetRoomState()
  }, [])

  // 局域网房间操作
  const createLANRoom = useCallback(
    async (data: CreateLANRoomData): Promise<LANRoom> => {
      try {
        // 获取本地IP
        const localIP = await lanServerManager.getLocalIP()
        console.log('创建局域网房间，本地IP:', localIP)

        // 连接到本地服务器
        socketService.connect(playerId, `http://${localIP}:3001`)

        // 等待连接成功
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('连接服务器超时'))
          }, 10000)

          const handleConnect = () => {
            clearTimeout(timeout)
            socketService.off('connect', handleConnect)
            socketService.off('connect_error', handleError)
            resolve()
          }

          const handleError = (error: any) => {
            clearTimeout(timeout)
            socketService.off('connect', handleConnect)
            socketService.off('connect_error', handleError)
            reject(error)
          }

          // 如果已经连接,直接resolve
          if (socketService.getIsConnected()) {
            clearTimeout(timeout)
            resolve()
            return
          }

          socketService.on('connect', handleConnect)
          socketService.on('connect_error', handleError)
        })

        // 标记为局域网模式
        setConnectionType('lan')

        // 创建房间(使用统一的API)
        await socketService.createRoom(data)

        // 等待房间创建成功
        return new Promise<LANRoom>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('创建房间超时'))
          }, 10000)

          const handleRoomUpdate = (room: OnlineRoom | LANRoom | null) => {
            if (room) {
              clearTimeout(timeout)
              socketService.off('currentRoomChanged', handleRoomUpdate)
              resolve(room as LANRoom)
            }
          }

          socketService.on('currentRoomChanged', handleRoomUpdate)
        })
      } catch (error: any) {
        console.error('创建局域网房间失败:', error)
        setConnectionType('online')
        throw error
      }
    },
    [playerId],
  )

  const joinLANRoom = useCallback(
    async (data: JoinLANRoomData): Promise<LANRoom> => {
      try {
        console.log('加入局域网房间:', data.hostIP, data.roomId)

        // 连接到指定的服务器
        socketService.connect(playerId, `http://${data.hostIP}:3001`)

        // 等待连接成功
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('连接服务器超时'))
          }, 10000)

          const handleConnect = () => {
            clearTimeout(timeout)
            socketService.off('connect', handleConnect)
            socketService.off('connect_error', handleError)
            resolve()
          }

          const handleError = (error: any) => {
            clearTimeout(timeout)
            socketService.off('connect', handleConnect)
            socketService.off('connect_error', handleError)
            reject(error)
          }

          // 如果已经连接,直接resolve
          if (socketService.getIsConnected()) {
            clearTimeout(timeout)
            resolve()
            return
          }

          socketService.on('connect', handleConnect)
          socketService.on('connect_error', handleError)
        })

        // 标记为局域网模式
        setConnectionType('lan')

        // 加入房间(使用统一的API)
        await socketService.joinRoom(data)

        // 等待加入成功
        return new Promise<LANRoom>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('加入房间超时'))
          }, 10000)

          const handleRoomUpdate = (room: OnlineRoom | LANRoom | null) => {
            if (room) {
              clearTimeout(timeout)
              socketService.off('currentRoomChanged', handleRoomUpdate)
              resolve(room as LANRoom)
            }
          }

          socketService.on('currentRoomChanged', handleRoomUpdate)
        })
      } catch (error: any) {
        console.error('加入局域网房间失败:', error)
        setConnectionType('online')
        throw error
      }
    },
    [playerId],
  )

  const switchToOnlineMode = useCallback(() => {
    console.log('切换到在线模式')
    // 断开当前连接
    if (socketService.getIsConnected()) {
      socketService.disconnect()
    }
    setConnectionType('online')
    // 重新连接到默认在线服务器
    socketService.connect(playerId)
  }, [playerId])

  const switchToLANMode = useCallback(() => {
    console.log('切换到局域网模式')
    if (currentRoom) {
      socketService.leaveRoom()
    }
    setConnectionType('lan')
  }, [currentRoom])

  // 游戏事件 - 统一使用socketService
  const startGame = useCallback((data: any) => {
    console.log('🎮 startGame called with data:', data)
    socketService.startGame(data)
  }, [])

  const rollDice = useCallback((data: any, callback: any) => {
    socketService.rollDice(data, callback)
  }, [])

  const completeTask = useCallback((data: any) => {
    socketService.completeTask(data)
  }, [])

  const emit = useCallback((event: string, data?: any) => {
    socketService.socketEmit(event, data)
  }, [])

  const on = useCallback((event: string, callback: Function) => {
    socketService.on(event, callback)
  }, [])

  const off = useCallback((event: string, callback: Function) => {
    socketService.off(event, callback)
  }, [])

  const runActions = useCallback((event: string, data: any, callback?: (res: any) => void) => {
    socketService.runActions(event, data, callback)
  }, [])

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
    isConnected,
    connectionError,
    currentRoom,

    // 连接类型和状态
    connectionType,
    currentLANRoom: connectionType === 'lan' ? (currentRoom as LANRoom) : null,
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

    // 房间发现 - 暂未实现
    getDiscoveredRooms: undefined,
    startRoomScan: undefined,
    stopRoomScan: undefined,

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
    isHost: socketService.isHost(playerId),
    currentPlayer: currentUser,
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
