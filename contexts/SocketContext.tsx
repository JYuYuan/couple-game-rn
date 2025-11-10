import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { socketService } from '@/services/socket-service'
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
import {
  getLANService,
  isLANAvailable,
  loadLANModules,
  isLANModulesLoaded,
  type RoomBroadcast,
} from '@/services/lan'
import { withLANService, withLANServiceTransform, withEventListener } from '@/utils/lan-helper'

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
  getDiscoveredRooms: (() => RoomBroadcast[]) | undefined
  startRoomScan: (() => void) | undefined
  stopRoomScan: (() => void) | undefined

  // 通用房间操作
  leaveRoom: () => void
  resetRoomState: () => void

  // 游戏事件
  startGame: (data: unknown) => void
  rollDice: (data: unknown, callback?: (result: DiceRollResult) => void) => void
  completeTask: (data: unknown) => void

  // 事件管理
  runActions: (event: string, data: unknown) => void
  emit: (event: string, data?: unknown) => void
  on: (event: string, callback: Function) => void
  off: (event: string, callback: Function) => void

  // 实用函数
  isHost: boolean
  currentPlayer: unknown
}

const SocketContext = createContext<SocketContextValue | null>(null)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { playerId, networkSettings } = useSettingsStore()
  const [isConnected, setIsConnected] = useState(socketService.getIsConnected())
  const [connectionError, setConnectionError] = useState(socketService.getConnectionError())
  const { currentRoom, setCurrentRoom } = useRoomStore()

  // 连接类型状态 - 根据网络设置智能初始化
  const getInitialConnectionType = (): ConnectionType => {
    const { enabled, lanMode } = networkSettings

    // 1. 如果只开启了局域网
    if (lanMode && !enabled) {
      return 'lan'
    }

    // 2. 如果只开启了在线（或都没开启）
    if (!lanMode || enabled) {
      return 'online'
    }

    // 默认在线
    return 'online'
  }

  const [connectionType, setConnectionType] = useState<ConnectionType>(getInitialConnectionType())
  const [webrtcConnections] = useState<Map<string, WebRTCConnectionState>>(new Map())
  const [discoveredRooms, setDiscoveredRooms] = useState<RoomBroadcast[]>([])

  // 监听网络设置变化，自动调整连接类型
  useEffect(() => {
    const { enabled, lanMode } = networkSettings

    // 如果当前是在线模式，但只开启了局域网，切换到局域网
    if (connectionType === 'online' && lanMode && !enabled && !currentRoom) {
      console.log('🔄 [SocketContext] 自动切换到局域网模式')
      setConnectionType('lan')
    }

    // 如果当前是局域网模式，但只开启了在线，切换到在线
    if (connectionType === 'lan' && !lanMode && enabled && !currentRoom) {
      console.log('🔄 [SocketContext] 自动切换到在线模式')
      setConnectionType('online')
    }
  }, [networkSettings.enabled, networkSettings.lanMode, connectionType, currentRoom])

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

  // 设置 LAN 事件监听器的辅助函数
  const setupLANEventListeners = useCallback(() => {
    if (!isLANModulesLoaded()) {
      console.log('⚠️ [SocketContext] LAN 模块未加载，无法注册事件监听器')
      return null
    }

    try {
      const lanService = getLANService()
      console.log('🐛 [SocketContext] LANService 获取成功，注册事件监听器')

      const handleLANRoomUpdate = (room: unknown) => {
        console.log('🐛 [SocketContext] LAN Room updated 事件触发!')
        console.log('🐛 [SocketContext] 房间数据:', {
          id: (room as any)?.id,
          gameStatus: (room as any)?.gameStatus,
          playersCount: (room as any)?.players?.length,
        })

        if (room) {
          const updatedRoom = {
            ...(room as any),
            isHost: (room as any).hostId === playerId,
            players: [...(room as any).players],
          }
          setCurrentRoom(updatedRoom)
          console.log('🐛 [SocketContext] setCurrentRoom 完成')
        }
      }

      const handleLANConnected = () => {
        console.log('LAN connected')
        setIsConnected(true)
      }

      const handleLANDisconnected = () => {
        console.log('LAN disconnected')
        setIsConnected(false)
      }

      lanService.on('room:update', handleLANRoomUpdate)
      lanService.on('connected', handleLANConnected)
      lanService.on('disconnected', handleLANDisconnected)

      console.log('🐛 [SocketContext] LAN 事件监听器已注册')
      console.log(
        '🐛 [SocketContext] room:update 监听器数量:',
        (lanService as any).eventListeners?.get('room:update')?.size || 0,
      )

      return () => {
        console.log('🐛 [SocketContext] 清理 LAN 事件监听器')
        lanService.off('room:update', handleLANRoomUpdate)
        lanService.off('connected', handleLANConnected)
        lanService.off('disconnected', handleLANDisconnected)
      }
    } catch (error) {
      console.warn('LAN 事件监听失败:', error)
      return null
    }
  }, [playerId, setCurrentRoom])

  // 监听 LAN Service 的事件 - 只在 LAN 模式且模块已加载时
  useEffect(() => {
    if (connectionType !== 'lan') {
      return
    }

    // 设置事件监听器
    const cleanup = setupLANEventListeners()
    return cleanup || undefined
  }, [connectionType, setupLANEventListeners])

  // 包装的方法
  const connect = useCallback(() => {
    if (
      !socketService.getIsConnected() ||
      networkSettings.socketUrl !== socketService.getServerURL()
    )
      socketService.connect(playerId, networkSettings.socketUrl)
  }, [playerId, networkSettings.socketUrl])

  const disconnect = useCallback(() => {
    withLANService(
      connectionType,
      (lanService) => lanService.leaveRoom(),
      () => socketService.disconnect(),
      '断开连接',
    )
  }, [connectionType])

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
    withLANService(
      connectionType,
      (lanService) => lanService.leaveRoom(),
      () => socketService.leaveRoom(),
      '离开房间',
    )
    // 确保清除 roomStore 中的房间状态
    const { useRoomStore } = require('@/store/roomStore')
    useRoomStore.getState().clearRoom()
  }, [connectionType])

  const resetRoomState = useCallback(() => {
    socketService.resetRoomState()
  }, [])

  // 局域网房间操作
  const createLANRoom = useCallback(
    async (data: CreateLANRoomData): Promise<LANRoom> => {
      try {
        console.log('创建局域网房间（纯 Wi-Fi 模式）')

        // 检查是否支持
        if (!isLANAvailable()) {
          throw new Error(
            'LAN 功能不可用\n' +
              '请使用 expo-dev-client 或生产构建\n\n' +
              '安装方法:\n' +
              '1. npx expo install expo-dev-client\n' +
              '2. npx expo run:ios',
          )
        }

        // 加载 LAN 模块
        await loadLANModules()
        const lanService = getLANService()

        // 初始化 LAN 服务
        await lanService.initialize(playerId)

        // 标记为局域网模式
        setConnectionType('lan')
        setIsConnected(true)

        // 在模块加载完成后设置事件监听器
        const cleanup = setupLANEventListeners()
        if (cleanup) {
          // 将清理函数保存，以便在组件卸载时调用
          // 注意：这里可能需要更好的清理机制
        }

        // 创建局域网房间，使用配置的端口
        const room = await lanService.createRoom(data, networkSettings.lanPort)

        console.log('✅ 局域网房间创建成功！')
        console.log('📱 房间ID:', room.id)
        console.log('🔌 端口:', networkSettings.lanPort)
        console.log('💡 其他玩家可以通过扫描加入')

        // 更新当前房间状态，触发跳转
        setCurrentRoom(room)

        return room as LANRoom
      } catch (error: any) {
        console.error('创建局域网房间失败:', error)
        setConnectionType('online')
        setIsConnected(false)
        throw error
      }
    },
    [playerId, networkSettings.lanPort],
  )

  const joinLANRoom = useCallback(
    async (data: JoinLANRoomData): Promise<LANRoom> => {
      try {
        console.log('🔗 [SocketContext] 加入局域网房间（纯 Wi-Fi 模式）')
        console.log('📋 [SocketContext] 请求数据:', JSON.stringify(data))

        // 检查是否支持
        if (!isLANAvailable()) {
          throw new Error('LAN 功能不可用\n' + '请使用 expo-dev-client 或生产构建')
        }

        // 加载 LAN 模块
        await loadLANModules()
        const lanService = getLANService()

        // 初始化 LAN 服务
        await lanService.initialize(playerId)

        // 标记为局域网模式
        setConnectionType('lan')

        // 构造 JoinRoomData（只包含必要字段）
        const joinData: JoinRoomData = {
          roomId: data.roomId,
          playerName: data.playerName,
          avatarId: data.avatarId,
          gender: data.gender,
        }

        console.log('📤 [SocketContext] 准备加入房间，数据:', JSON.stringify(joinData))

        // 如果提供了房主 IP 和端口，直接连接
        if (data.hostIP && data.hostPort) {
          console.log(`🔌 [SocketContext] 直接连接到: ${data.hostIP}:${data.hostPort}`)
          const room = await lanService.joinRoom(data.hostIP, data.hostPort, joinData)
          setIsConnected(true)
          console.log('✅ [SocketContext] 加入房间成功')
          // 更新当前房间状态，触发跳转
          setCurrentRoom(room)
          return room as LANRoom
        }

        // 否则，尝试从扫描结果中查找
        console.log('🔍 [SocketContext] 从扫描结果中查找房间...')
        const discovered = lanService.getDiscoveredRooms()
        console.log(`📡 [SocketContext] 发现 ${discovered.length} 个房间`)

        const targetRoom = discovered.find((r: unknown) => (r as any).roomId === data.roomId)

        if (!targetRoom) {
          console.error('❌ [SocketContext] 未找到房间:', data.roomId)
          throw new Error('未找到该房间，请确保在同一 Wi-Fi 网络下并开始扫描')
        }

        console.log('✅ [SocketContext] 找到目标房间:', JSON.stringify(targetRoom))
        const room = await lanService.joinRoomByBroadcast(targetRoom, joinData)
        setIsConnected(true)
        console.log('✅ [SocketContext] 加入房间成功')
        // 更新当前房间状态，触发跳转
        setCurrentRoom(room)
        return room as LANRoom
      } catch (error: any) {
        console.error('❌ [SocketContext] 加入局域网房间失败:', error)
        console.error('❌ [SocketContext] 错误堆栈:', error.stack)
        setConnectionType('online')
        setIsConnected(false)
        throw error
      }
    },
    [playerId],
  )

  const switchToOnlineMode = useCallback(() => {
    console.log('切换到在线模式')
    // 断开当前连接
    if (connectionType === 'lan') {
      try {
        const lanService = getLANService()
        lanService.cleanup()
      } catch (error) {
        console.warn('LAN cleanup 失败:', error)
      }
    } else if (socketService.getIsConnected()) {
      socketService.disconnect()
    }
    setConnectionType('online')
    // 重新连接到默认在线服务器
    socketService.connect(playerId, networkSettings.socketUrl)
  }, [playerId, connectionType, networkSettings.socketUrl])

  const switchToLANMode = useCallback(() => {
    console.log('切换到局域网模式')
    if (currentRoom) {
      if (connectionType === 'lan') {
        try {
          const lanService = getLANService()
          lanService.leaveRoom()
        } catch (error) {
          console.warn('LAN 离开房间失败:', error)
        }
      } else {
        socketService.leaveRoom()
      }
    }
    setConnectionType('lan')
  }, [currentRoom, connectionType])

  // 房间扫描功能
  const startRoomScan = useCallback(async () => {
    try {
      if (!isLANAvailable()) {
        throw new Error('LAN 功能不可用')
      }
      await loadLANModules()
      const lanService = getLANService()
      lanService.startRoomScan((rooms: RoomBroadcast[]) => {
        setDiscoveredRooms(rooms)
      })
    } catch (error) {
      console.error('开始扫描失败:', error)
    }
  }, [])

  const stopRoomScan = useCallback(() => {
    try {
      const lanService = getLANService()
      lanService.stopRoomScan()
    } catch (error) {
      console.warn('停止扫描失败:', error)
    }
  }, [])

  const getDiscoveredRooms = useCallback(() => {
    return discoveredRooms
  }, [discoveredRooms])

  // 游戏事件 - 统一使用socketService
  const startGame = useCallback(
    async (data: unknown) => {
      console.log('🎮 startGame called with data:', data)
      await withLANService(
        connectionType,
        (lanService) => lanService.startGame(data as any),
        () => socketService.startGame(data as any),
        '开始游戏',
      )
    },
    [connectionType],
  )

  const rollDice = useCallback(
    async (data: unknown, callback: unknown) => {
      console.log('🎲 [SocketContext] rollDice 调用, connectionType:', connectionType)
      console.log('🐛 [SocketContext] rollDice data:', JSON.stringify(data))

      await withLANServiceTransform(
        connectionType,
        data,
        (d: any) => ({ ...d, type: 'roll_dice' }),
        (lanService, transformedData) => {
          console.log('📤 [SocketContext] 发送游戏动作:', JSON.stringify(transformedData))
          return lanService.handleGameAction(transformedData).then(callback as any)
        },
        (d) => socketService.rollDice(d as any, callback as any),
        '掷骰子',
      )
    },
    [connectionType],
  )

  const completeTask = useCallback(
    async (data: unknown) => {
      await withLANServiceTransform(
        connectionType,
        data,
        (d: any) => ({ ...d, type: 'complete_task' }),
        (lanService, transformedData) => {
          return lanService.handleGameAction(transformedData)
        },
        (d) => socketService.completeTask(d as any),
        '完成任务',
      )
    },
    [connectionType],
  )

  const emit = useCallback((event: string, data?: unknown) => {
    socketService.socketEmit(event, data)
  }, [])

  const on = useCallback(
    (event: string, callback: Function) => {
      withEventListener(connectionType, event, callback, 'on', socketService)
    },
    [connectionType],
  )

  const off = useCallback(
    (event: string, callback: Function) => {
      withEventListener(connectionType, event, callback, 'off', socketService)
    },
    [connectionType],
  )

  const runActions = useCallback(
    async (event: string, data: unknown, callback?: (res: unknown) => void) => {
      console.log(
        '🎬 [SocketContext] runActions 调用, event:',
        event,
        'connectionType:',
        connectionType,
      )
      console.log('🐛 [SocketContext] runActions data:', JSON.stringify(data))

      await withLANServiceTransform(
        connectionType,
        data,
        (d: any) => ({ ...d, type: event }),
        (lanService, transformedData) => {
          console.log('📤 [SocketContext] LAN 模式发送动作:', JSON.stringify(transformedData))
          return lanService.handleGameAction(transformedData).then(callback)
        },
        (d) => socketService.runActions(event, d, callback),
        'runActions',
      )
    },
    [connectionType],
  )

  // 初始连接逻辑 - 只在首次加载时连接一次
  // 如果只开启局域网模式而未开启网络模式，则不自动连接
  useEffect(() => {
    const socket = socketService.getSocket()

    // 检查是否应该自动连接
    // 只有在开启了网络模式（非纯局域网模式）时才自动连接
    const shouldAutoConnect = networkSettings.enabled && !networkSettings.lanMode

    if (!shouldAutoConnect) {
      console.log(
        'SocketProvider: 跳过自动连接 (网络未启用)',
        'networkSettings.enabled:',
        networkSettings.enabled,
        'networkSettings.lanMode:',
        networkSettings.lanMode,
      )
      return
    }

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
  }, [playerId, connect, networkSettings.enabled, networkSettings.lanMode])

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

    // 房间发现
    getDiscoveredRooms: connectionType === 'lan' ? getDiscoveredRooms : undefined,
    startRoomScan: connectionType === 'lan' ? startRoomScan : undefined,
    stopRoomScan: connectionType === 'lan' ? stopRoomScan : undefined,

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
      createLANRoom: async () => ({}) as LANRoom,
      joinLANRoom: async () => ({}) as LANRoom,
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
