import { io, Socket } from 'socket.io-client'
import {
  CreateRoomData,
  DiceRollData,
  DiceRollResult,
  GameStartData,
  JoinRoomData,
  OnlineRoom,
  SocketError,
  TaskCompleteData,
} from '@/types/online'
import { showError } from '@/utils/toast'

const DEFAULT_SOCKET_URL = __DEV__ ? 'http://localhost:3001' : 'https://your-production-server.com'

// 单例 Socket 服务
class SocketService {
  private static instance: SocketService
  private socket: Socket | null = null
  private currentRoom: OnlineRoom | null = null
  private isConnected: boolean = false
  private connectionError: string | null = null
  private listeners: Map<string, Set<Function>> = new Map()
  private connecting: boolean = false // 添加连接状态标识
  private currentPlayerId: string = '' // 保存当前玩家ID
  private eventListenersSetup: boolean = false // 追踪是否已设置事件监听器
  private serverURL: string = DEFAULT_SOCKET_URL // 当前服务器URL

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  // 获取状态
  getCurrentRoom(): OnlineRoom | null {
    return this.currentRoom
  }

  getIsConnected(): boolean {
    return this.isConnected
  }

  getConnectionError(): string | null {
    return this.connectionError
  }

  getSocket(): Socket | null {
    return this.socket
  }

  // 获取当前服务器URL
  getServerURL(): string {
    return this.serverURL
  }

  // 设置服务器URL
  setServerURL(url: string): void {
    this.serverURL = url
    console.log('SocketService: Server URL updated to:', url)
  }

  // 检查真实的连接状态
  checkRealConnectionStatus(): boolean {
    const socketConnected = this.socket?.connected || false
    const serviceConnected = this.isConnected

    // 如果状态不一致，更新内部状态
    if (socketConnected !== serviceConnected) {
      console.warn(
        `[SocketService] Connection state mismatch: socket.connected=${socketConnected}, isConnected=${serviceConnected}`,
      )
      this.isConnected = socketConnected

      if (socketConnected) {
        this.emit('connect')
      } else {
        this.emit('disconnect', 'state_mismatch')
      }
    }

    return socketConnected && serviceConnected
  }

  // 事件管理
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    const listeners = this.listeners.get(event)!
    listeners.add(callback)
    console.log(`SocketService: Registered listener for event: ${event}, total: ${listeners.size}`)
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      const hadListener = eventListeners.has(callback)
      eventListeners.delete(callback)
      if (hadListener) {
        console.log(
          `SocketService: Removed listener for event: ${event}, remaining: ${eventListeners.size}`,
        )
      }
    }
  }

  // 清除特定事件的所有监听器
  offAll(event: string): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      const count = eventListeners.size
      eventListeners.clear()
      console.log(`SocketService: Cleared all ${count} listeners for event: ${event}`)
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners && eventListeners.size > 0) {
      console.log(`SocketService: Emitting event ${event} to ${eventListeners.size} listeners`)
      eventListeners.forEach((callback) => {
        try {
          callback(...args)
        } catch (error) {
          console.error(`SocketService: Error in listener for ${event}:`, error)
        }
      })
    } else {
      console.warn(`SocketService: No listeners registered for event: ${event}`)
    }
  }

  // 获取监听器数量，用于调试HMR问题
  getListenerCount(event?: string): number {
    if (event) {
      return this.listeners.get(event)?.size || 0
    }
    let total = 0
    this.listeners.forEach((listeners) => (total += listeners.size))
    return total
  }

  // 列出所有已注册的事件，用于调试
  listRegisteredEvents(): string[] {
    return Array.from(this.listeners.keys())
  }

  // 连接管理
  connect(playerId: string, serverURL?: string): void {
    // 如果提供了新的serverURL，更新它
    if (serverURL) {
      // 如果URL变化了，需要断开现有连接
      if (this.serverURL !== serverURL && this.socket) {
        console.log('SocketService: Server URL changed, disconnecting existing connection')
        this.disconnect()
      }
      this.serverURL = serverURL
    }

    console.log('SocketService Connection Server URL:', this.serverURL)
    // 如果已经有socket实例且已连接，只需要更新playerId
    if (this.socket?.connected) {
      console.log('SocketService: Already connected:', this.socket.id)
      if (this.currentPlayerId !== playerId) {
        console.log('SocketService: Updating player ID from', this.currentPlayerId, 'to', playerId)
        this.currentPlayerId = playerId
      }
      return
    }

    // 如果有socket实例但未连接，尝试重新连接
    if (this.socket && !this.socket.connected) {
      console.log('SocketService: Socket exists but not connected, attempting reconnect')
      this.currentPlayerId = playerId
      // 确保事件监听器已设置
      if (!this.eventListenersSetup) {
        this.setupEventListeners()
      }
      this.socket.connect()
      return
    }

    if (this.connecting) {
      console.log('SocketService: Connection already in progress, skipping...')
      return
    }

    this.connecting = true
    this.currentPlayerId = playerId // 保存当前玩家ID

    console.log(`SocketService: Connecting to ${this.serverURL}`)

    this.socket = io(this.serverURL, {
      reconnection: true, // 启用重连
      reconnectionDelay: 1000, // 重连延迟 1 秒
      reconnectionDelayMax: 5000, // 最大重连延迟 5 秒
      reconnectionAttempts: 5, // 重连尝试次数
      transports: ['websocket', 'polling'], // 支持多种传输方式
      query: {
        playerId: playerId,
      },
    })

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    if (!this.socket) return

    // 使用标志位检查是否已经设置过监听器，避免重复注册
    if (this.eventListenersSetup) {
      console.log('SocketService: Event listeners already set up, skipping...')
      return
    }

    console.log('SocketService: Setting up event listeners')
    this.eventListenersSetup = true

    this.socket.on('connect', () => {
      console.log(`SocketService: Connected with socket ID: ${this.socket?.id}`)
      this.isConnected = true
      this.connectionError = null
      this.connecting = false
      this.emit('connect')
    })

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('SocketService: Reconnected after', attemptNumber, 'attempts')
      this.isConnected = true
      this.connecting = false
      this.connectionError = null
      this.emit('reconnect', attemptNumber)

      // 重连成功后重新加入房间
      if (this.currentRoom) {
        console.log('SocketService: Rejoining room after reconnection:', this.currentRoom.id)
        setTimeout(() => {
          if (this.socket?.connected && this.currentRoom) {
            this.socket.emit('room:join', {
              roomId: this.currentRoom.id,
              playerName:
                this.currentRoom.players.find((p) => p.id === this.currentPlayerId)?.name ||
                'Player',
            })
          }
        }, 1000)
      }
    })

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('SocketService: Reconnection attempt', attemptNumber)
      this.emit('reconnect_attempt', attemptNumber)
    })

    this.socket.on('reconnect_error', (error: unknown) => {
      console.error('SocketService: Reconnection error:', error)
      this.emit('reconnect_error', error)
    })

    this.socket.on('reconnect_failed', () => {
      console.error('SocketService: Reconnection failed after all attempts')
      this.isConnected = false
      this.connecting = false
      this.connectionError = '重连失败，请检查网络连接'
      showError('连接失败', '无法重新连接到服务器，请检查网络')
      this.emit('reconnect_failed')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('SocketService: Disconnected:', reason)
      this.isConnected = false
      this.connecting = false
      this.emit('disconnect', reason)

      // 只在非正常断开时显示提示
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
        console.log('SocketService: Unexpected disconnect, will attempt to reconnect')
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('SocketService: Connection error:', error)
      this.isConnected = false
      this.connecting = false // 重置连接状态
      this.connectionError = `连接失败: ${error.message}`
      // 使用Toast显示连接错误
      showError('连接失败', error.message || '无法连接到服务器')
      this.emit('connect_error', error)
    })

    this.socket.on('room:update', (room: OnlineRoom) => {
      this.setCurrentRoom(room, 'room:update event')
    })

    this.socket.on('error', (error: SocketError) => {
      this.connectionError = error.message
      // 使用Toast显示错误信息
      showError('连接错误', error.message)
      this.emit('error', error)
    })

    // 游戏相关事件转发
    this.socket.on('game:dice', (data) => {
      this.emit('game:dice', data)
    })

    this.socket.on('game:task', (data) => {
      this.emit('game:task', data)
    })

    this.socket.on('game:victory', (data) => {
      this.emit('game:victory', data)
    })

    this.socket.on('game:move', (data) => {
      this.emit('game:move', data)
    })

    this.socket.on('game:next', (data) => {
      this.emit('game:next', data)
    })

    // 添加通用事件监听器用于调试
    this.socket.onAny((eventName, ...args) => {
      console.log(`SocketService: Event received: ${eventName}`, args)
    })

    // 添加连接状态检查的辅助方法
    this.socket.on('ping', () => {
      console.log('SocketService: Ping received')
    })

    this.socket.on('pong', (latency: number) => {
      console.log('SocketService: Pong received, latency:', latency)
    })

    // 局域网房间发现事件
    this.socket.on('lan:rooms', (rooms: unknown[]) => {
      console.log('SocketService: Received LAN rooms:', rooms.length)
      const roomDiscovery = require('./room-discovery-service').roomDiscoveryService
      roomDiscovery.handleRoomList(rooms)
    })

    // 在线房间列表事件
    this.socket.on('room:list', (rooms: OnlineRoom[]) => {
      console.log('SocketService: Received online room list:', rooms.length)
      this.emit('room:list', rooms)
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      this.connecting = false // 重置连接状态
      this.eventListenersSetup = false // 重置监听器标志
      this.setCurrentRoom(null, 'disconnect')
    }
  }

  // 房间管理
  setCurrentRoom(room: OnlineRoom | null, source: string): void {
    console.log(`SocketService: Room changed from ${source}:`, {
      from: this.currentRoom?.id || 'null',
      to: room?.id || 'null',
    })
    this.currentRoom = room
    this.emit('currentRoomChanged', room)
  }

  // Socket 操作
  socketEmit(event: string, ...args: unknown[]): void {
    // 直接检查socket实例的连接状态，不使用checkRealConnectionStatus避免副作用
    if (!this.socket?.connected) {
      console.warn(
        `SocketService: Cannot emit ${event} - socket not connected (socket exists: ${!!this.socket})`,
      )
      showError('连接错误', '网络连接已断开，请检查连接状态')
      return
    }

    console.log(`SocketService: Emitting ${event} to socket ${this.socket.id}`)
    this.socket.emit(event, ...args)
  }

  // 添加重新连接方法
  private reconnect(): void {
    if (this.connecting || this.socket?.connected) {
      console.log('SocketService: Reconnection skipped - already connecting or connected')
      return
    }

    console.log('SocketService: Manual reconnect triggered')

    // 让Socket.IO处理重连，我们只重置状态
    if (this.socket && !this.socket.connected) {
      this.socket.connect()
    } else if (this.currentPlayerId) {
      this.connect(this.currentPlayerId)
    }
  }

  // 强制重新连接方法，用于路由跳转后确保连接正常
  forceReconnect(): void {
    console.log('SocketService: Force reconnecting...')

    // 重置连接状态
    this.isConnected = false
    this.connecting = false
    this.eventListenersSetup = false // 重置监听器标志

    // 断开现有连接
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    // 立即重新连接
    if (this.currentPlayerId) {
      this.connect(this.currentPlayerId)
    }
  }

  // 等待 socket 连接就绪
  private async waitForConnection(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket未初始化'))
        return
      }

      // 如果已经连接，检查是否有待发送的队列
      if (this.socket.connected) {
        // @ts-ignore - 访问 Socket.IO 内部属性
        const sendBuffer = this.socket.sendBuffer || []
        // @ts-ignore
        const receiveBuffer = this.socket.receiveBuffer || []

        console.log('🔍 Socket状态检查:', {
          connected: this.socket.connected,
          id: this.socket.id,
          sendBufferLength: sendBuffer.length,
          receiveBufferLength: receiveBuffer.length,
        })

        // 如果有待发送的数据，等待一下让它们发送完
        if (sendBuffer.length > 0) {
          console.log('⏳ 等待发送缓冲区清空...')
          setTimeout(() => resolve(), 200)
          return
        }

        // 已连接且没有待发送数据，直接返回
        resolve()
        return
      }

      // 未连接，等待连接
      const timeoutId = setTimeout(() => {
        reject(new Error('连接超时'))
      }, timeout)

      const onConnect = () => {
        clearTimeout(timeoutId)
        this.socket?.off('connect', onConnect)
        // 连接成功后等待一小段时间确保传输层就绪
        setTimeout(() => resolve(), 100)
      }

      this.socket.once('connect', onConnect)

      // 如果正在连接中，继续等待
      if (this.connecting) {
        console.log('⏳ Socket正在连接中，等待连接完成...')
      }
    })
  }

  // 房间操作
  async createRoom(data: CreateRoomData): Promise<void> {
    // Socket 模式:使用 Socket.IO
    if (!this.socket) {
      const errorMsg = 'Socket未初始化'
      showError('创建房间失败', errorMsg)
      throw new Error(errorMsg)
    }

    // 等待连接就绪
    try {
      await this.waitForConnection()
    } catch (error) {
      const errorMsg = 'Socket连接未就绪'
      showError('创建房间失败', errorMsg)
      throw new Error(errorMsg)
    }

    console.log('✅ Socket ready, creating room:', this.socket.connected, this.socket.id)
    this.socket.emit('room:create', data)
  }

  async joinRoom(data: JoinRoomData): Promise<void> {
    // Socket 模式:使用 Socket.IO
    if (!this.socket) {
      const errorMsg = 'Socket未初始化'
      showError('加入房间失败', errorMsg)
      throw new Error(errorMsg)
    }

    // 等待连接就绪
    try {
      await this.waitForConnection()
    } catch (error) {
      const errorMsg = 'Socket连接未就绪'
      showError('加入房间失败', errorMsg)
      throw new Error(errorMsg)
    }

    console.log('✅ Socket ready, joining room:', this.socket.connected, this.socket.id)
    this.socket.emit('room:join', data)
  }

  leaveRoom(): void {
    // Socket 模式
    if (this.socket && this.currentRoom) {
      this.socket.emit('room:leave', { roomId: this.currentRoom.id })
      this.setCurrentRoom(null, 'leaveRoom')
      // 同时清除 roomStore 中的持久化状态
      const { useRoomStore } = require('@/store/roomStore')
      useRoomStore.getState().clearRoom()
    }
  }

  // 获取房间列表
  requestRoomList(): void {
    if (this.socket?.connected) {
      console.log('SocketService: Requesting room list')
      this.socket.emit('room:list')
    } else {
      console.warn('SocketService: Cannot request room list - not connected')
    }
  }

  resetRoomState(): void {
    console.log('SocketService: Resetting room state')
    this.setCurrentRoom(null, 'resetRoomState')
    this.connectionError = null
  }

  // 游戏事件
  startGame(data: GameStartData): void {
    // Socket 模式
    this.socketEmit('game:start', data)
  }

  rollDice(data: DiceRollData, callback?: (result: DiceRollResult) => void): void {
    this.runActions('roll_dice', data, callback)
  }

  completeTask(data: TaskCompleteData): void {
    this.runActions('complete_task', data)
  }

  runActions(type: string, data: unknown, callback?: (res: unknown) => void): void {
    console.log('游戏事件：', type, data)

    // Socket 模式
    this.socketEmit('game:action', { type, ...data }, callback)
  }

  // 便利属性
  isHost(playerId: string): boolean {
    return this.currentRoom ? playerId === this.currentRoom.hostId : false
  }

  getCurrentPlayer() {
    this.on('game:state', (data: unknown) => {
      console.log(data)
    })
  }
}

export const socketService = SocketService.getInstance()
